import os
import fitz  # PyMuPDF
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from database import settings

# Configure Google API Key
os.environ["GOOGLE_API_KEY"] = settings.google_api_key

def get_pdf_text(pdf_path: str) -> str:
    text = ""
    with fitz.open(pdf_path) as doc:
        for page in doc:
            text += page.get_text()
    return text

def get_text_chunks(text: str) -> list:
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
    chunks = text_splitter.split_text(text)
    return chunks

def get_vector_store(text_chunks: list, vector_store_path: str):
    embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")
    vector_store = FAISS.from_texts(text_chunks, embedding=embeddings)
    vector_store.save_local(vector_store_path)

def process_pdf(pdf_path: str, vector_store_path: str):
    text = get_pdf_text(pdf_path)
    if not text.strip():
        raise ValueError("Could not extract text from PDF.")
    text_chunks = get_text_chunks(text)
    get_vector_store(text_chunks, vector_store_path)

def get_conversational_chain():
    prompt = ChatPromptTemplate.from_template("""
    Answer the question as detailed as possible from the provided context, make sure to provide all the details. 
    If the answer is not in provided context just say, "answer is not available in the context", don't provide the wrong answer.
    
    Context:
    {context}
    
    Chat History:
    {chat_history}
    
    Question: 
    {question}

    Answer:
    """)
    
    model = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.3)
    chain = prompt | model | StrOutputParser()
    return chain

def ask_question(vector_store_path: str, question: str, chat_history: str = "") -> str:
    embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")
    try:
        new_db = FAISS.load_local(vector_store_path, embeddings, allow_dangerous_deserialization=True)
    except Exception as e:
        raise ValueError("Failed to load vector store: " + str(e))

    # Retrieve relevant documents
    docs = new_db.similarity_search(question)
    
    # Format documents into a single context string
    context = "\n\n".join([doc.page_content for doc in docs])
    
    # Use the modern LCEL chain to generate the answer
    chain = get_conversational_chain()
    response = chain.invoke({
        "context": context, 
        "chat_history": chat_history,
        "question": question
    })
    
    return response
