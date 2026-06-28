from pydantic import BaseModel, EmailStr
from typing import Optional, List
import datetime

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class PDFDocumentResponse(BaseModel):
    id: int
    filename: str
    created_at: datetime.datetime
    last_accessed: Optional[datetime.datetime] = None
    file_size: Optional[int] = 0
    chat_count: Optional[int] = 0

    class Config:
        from_attributes = True

class ChatRequest(BaseModel):
    question: str

class ChatResponse(BaseModel):
    answer: str

class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class ChatSessionResponse(BaseModel):
    id: int
    name: str
    pdf_id: int
    created_at: datetime.datetime
    updated_at: datetime.datetime
    message_count: Optional[int] = 0

    class Config:
        from_attributes = True

class ChatSessionCreate(BaseModel):
    name: Optional[str] = "New Chat"

class ChatSessionUpdate(BaseModel):
    name: str

class DashboardStatsResponse(BaseModel):
    total_pdfs: int
    total_chats: int
    total_questions: int
    recent_pdfs: List[PDFDocumentResponse]
    recent_chats: List[ChatSessionResponse]
