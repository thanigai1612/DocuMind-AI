# DocuMind AI

An intelligent, professional SaaS-style application for chatting with your PDF documents. DocuMind AI utilizes LangChain, FAISS, and Google's Gemini models to provide highly accurate, contextual answers based solely on your uploaded PDFs.

## Phase 3A Features

- **Professional UI/UX:** Built with React, Tailwind CSS v4, and Framer Motion for a sleek, responsive interface.
- **Dynamic Theming:** Seamless Dark and Light modes that sync with your system or save your preference in local storage.
- **Contextual Memory (RAG):** The AI remembers the entire chat history for each session, allowing for natural, follow-up questions.
- **Document Management:** Upload PDFs, manage distinct chat sessions for each document, and view global statistics on a modern dashboard.
- **Robust State Management:** Asynchronous actions are paired with optimistic UI updates, loading skeletons, and interactive toast notifications.

## Technology Stack

### Frontend
- React 19 + Vite
- Tailwind CSS v4
- React Router DOM v7
- Framer Motion
- React Hot Toast
- Lucide React Icons

### Backend
- FastAPI
- SQLAlchemy + SQLite
- LangChain Core
- FAISS (Vector Storage)
- Google Generative AI (Gemini 2.5 Flash & Embeddings)
- PyMuPDF (PDF Parsing)

## Getting Started

### 1. Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```
Copy `.env.example` to `.env` and add your Google Gemini API Key.
```bash
uvicorn main:app --reload
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` to start using DocuMind AI!
