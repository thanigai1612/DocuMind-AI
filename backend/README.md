# DocuMind AI Backend

This is the FastAPI backend for the AI ChatPDF application. It provides authentication, PDF upload processing, and an integrated Retrieval-Augmented Generation (RAG) pipeline using LangChain, FAISS, and Google Gemini API.

## Setup

1. **Install Dependencies:**
   Make sure you have Python 3.9+ installed.
   ```bash
   pip install -r requirements.txt
   ```

2. **Environment Variables:**
   Copy `.env.example` to `.env` and fill in your keys.
   ```bash
   cp .env.example .env
   ```
   *Note: Make sure to set a secure `SECRET_KEY` and your `GOOGLE_API_KEY`.*

3. **Run the Server:**
   ```bash
   uvicorn main:app --reload
   ```

## Endpoints
- `POST /api/auth/register`: Register a new user
- `POST /api/auth/login`: Login and receive a JWT
- `POST /api/pdf/upload`: Upload a PDF (requires auth)
- `GET /api/pdf/list`: Get a list of uploaded PDFs (requires auth)
- `POST /api/chat/{pdf_id}/ask`: Ask a question about a specific PDF (requires auth)
