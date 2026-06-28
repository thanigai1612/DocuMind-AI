import os
import shutil
import datetime
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from typing import List

import models
import schemas
from database import engine, get_db
from auth import get_password_hash, verify_password, create_access_token, get_current_user
from rag import process_pdf, ask_question

def migrate_db(engine):
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE pdf_documents ADD COLUMN last_accessed DATETIME"))
            conn.execute(text("ALTER TABLE pdf_documents ADD COLUMN file_size INTEGER DEFAULT 0"))
            conn.commit()
        except Exception:
            # Columns likely already exist
            pass

migrate_db(engine)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="DocuMind AI Backend - Phase 2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
VECTOR_STORE_DIR = "vector_stores"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(VECTOR_STORE_DIR, exist_ok=True)

# ----------------- AUTH -----------------

@app.post("/api/auth/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = models.User(email=user.email, hashed_password=get_password_hash(user.password))
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/api/auth/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

# ----------------- DASHBOARD -----------------

@app.get("/api/dashboard/stats", response_model=schemas.DashboardStatsResponse)
def get_dashboard_stats(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    total_pdfs = db.query(models.PDFDocument).filter(models.PDFDocument.owner_id == current_user.id).count()
    
    total_chats = db.query(models.ChatSession).join(models.PDFDocument).filter(
        models.PDFDocument.owner_id == current_user.id
    ).count()
    
    total_questions = db.query(models.Message).join(models.ChatSession).join(models.PDFDocument).filter(
        models.PDFDocument.owner_id == current_user.id,
        models.Message.role == "user"
    ).count()
    
    recent_pdfs = db.query(models.PDFDocument).filter(
        models.PDFDocument.owner_id == current_user.id
    ).order_by(models.PDFDocument.created_at.desc()).limit(5).all()
    
    recent_chats = db.query(models.ChatSession).join(models.PDFDocument).filter(
        models.PDFDocument.owner_id == current_user.id
    ).order_by(models.ChatSession.updated_at.desc()).limit(5).all()
    
    return {
        "total_pdfs": total_pdfs,
        "total_chats": total_chats,
        "total_questions": total_questions,
        "recent_pdfs": recent_pdfs,
        "recent_chats": recent_chats
    }

# ----------------- PDFS -----------------

@app.post("/api/pdf/upload", response_model=schemas.PDFDocumentResponse)
def upload_pdf(file: UploadFile = File(...), current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    file_path = os.path.join(UPLOAD_DIR, f"{current_user.id}_{file.filename}")
    
    # Save file and calculate size
    file_size = 0
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    file_size = os.path.getsize(file_path)

    vector_store_path = os.path.join(VECTOR_STORE_DIR, f"vs_{current_user.id}_{file.filename}")

    try:
        process_pdf(file_path, vector_store_path)
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")

    new_pdf = models.PDFDocument(
        filename=file.filename,
        file_path=file_path,
        vector_store_path=vector_store_path,
        owner_id=current_user.id,
        file_size=file_size,
        last_accessed=datetime.datetime.utcnow()
    )
    db.add(new_pdf)
    db.commit()
    db.refresh(new_pdf)
    return new_pdf

@app.get("/api/pdf/history", response_model=List[schemas.PDFDocumentResponse])
@app.get("/api/pdf/list", response_model=List[schemas.PDFDocumentResponse])
def list_pdfs(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    pdfs = db.query(models.PDFDocument).filter(models.PDFDocument.owner_id == current_user.id).all()
    # Enrich with chat count
    for pdf in pdfs:
        pdf.chat_count = db.query(models.ChatSession).filter(models.ChatSession.pdf_id == pdf.id).count()
    return pdfs

@app.delete("/api/pdf/{pdf_id}")
def delete_pdf(pdf_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    pdf = db.query(models.PDFDocument).filter(models.PDFDocument.id == pdf_id, models.PDFDocument.owner_id == current_user.id).first()
    if not pdf:
        raise HTTPException(status_code=404, detail="PDF not found")
    
    # Cleanup files
    if os.path.exists(pdf.file_path):
        os.remove(pdf.file_path)
    if pdf.vector_store_path and os.path.exists(pdf.vector_store_path):
        shutil.rmtree(pdf.vector_store_path, ignore_errors=True)
        
    db.delete(pdf)
    db.commit()
    return {"message": "PDF deleted"}

# ----------------- CHATS & MESSAGES -----------------

@app.post("/api/chat/create/{pdf_id}", response_model=schemas.ChatSessionResponse)
def create_chat(pdf_id: int, req: schemas.ChatSessionCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    pdf = db.query(models.PDFDocument).filter(models.PDFDocument.id == pdf_id, models.PDFDocument.owner_id == current_user.id).first()
    if not pdf:
        raise HTTPException(status_code=404, detail="PDF not found")
    
    new_chat = models.ChatSession(name=req.name, pdf_id=pdf.id)
    db.add(new_chat)
    
    # Update PDF last accessed
    pdf.last_accessed = datetime.datetime.utcnow()
    
    db.commit()
    db.refresh(new_chat)
    return new_chat

@app.get("/api/chat/history/{pdf_id}", response_model=List[schemas.ChatSessionResponse])
def get_chats_for_pdf(pdf_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    pdf = db.query(models.PDFDocument).filter(models.PDFDocument.id == pdf_id, models.PDFDocument.owner_id == current_user.id).first()
    if not pdf:
        raise HTTPException(status_code=404, detail="PDF not found")
    
    chats = db.query(models.ChatSession).filter(models.ChatSession.pdf_id == pdf_id).order_by(models.ChatSession.updated_at.desc()).all()
    for chat in chats:
        chat.message_count = db.query(models.Message).filter(models.Message.chat_id == chat.id).count()
    return chats

@app.put("/api/chat/rename/{chat_id}", response_model=schemas.ChatSessionResponse)
def rename_chat(chat_id: int, req: schemas.ChatSessionUpdate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    chat = db.query(models.ChatSession).join(models.PDFDocument).filter(
        models.ChatSession.id == chat_id,
        models.PDFDocument.owner_id == current_user.id
    ).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
        
    chat.name = req.name
    chat.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(chat)
    return chat

@app.delete("/api/chat/{chat_id}")
def delete_chat(chat_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    chat = db.query(models.ChatSession).join(models.PDFDocument).filter(
        models.ChatSession.id == chat_id,
        models.PDFDocument.owner_id == current_user.id
    ).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
        
    db.delete(chat)
    db.commit()
    return {"message": "Chat deleted"}

@app.get("/api/chat/{chat_id}/messages", response_model=List[schemas.MessageResponse])
def get_chat_messages(chat_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    chat = db.query(models.ChatSession).join(models.PDFDocument).filter(
        models.ChatSession.id == chat_id,
        models.PDFDocument.owner_id == current_user.id
    ).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
        
    messages = db.query(models.Message).filter(models.Message.chat_id == chat_id).order_by(models.Message.created_at.asc()).all()
    return messages

@app.post("/api/chat/{chat_id}/ask", response_model=schemas.ChatResponse)
def ask_chat_question(
    chat_id: int,
    request: schemas.ChatRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    chat = db.query(models.ChatSession).join(models.PDFDocument).filter(
        models.ChatSession.id == chat_id,
        models.PDFDocument.owner_id == current_user.id
    ).first()
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    pdf = chat.pdf
    if not os.path.exists(pdf.vector_store_path):
        raise HTTPException(status_code=500, detail="Vector store not found")

    # Store user message
    user_msg = models.Message(chat_id=chat.id, role="user", content=request.question)
    db.add(user_msg)
    
    # Get previous messages for history
    previous_msgs = db.query(models.Message).filter(models.Message.chat_id == chat.id).order_by(models.Message.created_at.asc()).all()
    history_str = "\n".join([f"{m.role.capitalize()}: {m.content}" for m in previous_msgs])

    try:
        answer = ask_question(pdf.vector_store_path, request.question, history_str)
        
        # Store AI message
        ai_msg = models.Message(chat_id=chat.id, role="ai", content=answer)
        db.add(ai_msg)
        
        chat.updated_at = datetime.datetime.utcnow()
        pdf.last_accessed = datetime.datetime.utcnow()
        
        db.commit()
        return schemas.ChatResponse(answer=answer)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error generating answer: {str(e)}")
