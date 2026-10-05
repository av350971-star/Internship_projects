"""
FastAPI Server: Context-Aware Support Assistant
Provides REST endpoints and serves the React Vite application.
Enforces server-side API key management, role-based document access, and role/session consistency.
"""

import os
import uuid
from pathlib import Path
from typing import Dict, List, Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .config import (
    DEFAULT_CONTEXT_BUDGET,
    DEFAULT_SUMMARIZE_THRESHOLD,
    ROLE_CUSTOMER,
    ROLE_SUPPORT_AGENT,
    ALLOWED_ROLES,
    DATA_DIR
)
from .prompt_manager import prompt_manager
from .retriever import document_retriever
from .pipeline import assistant_pipeline
import json

app = FastAPI(
    title="Context-Aware Support Assistant",
    description="Role-based context switching, vector RAG retrieval, threshold summarization, and safe metadata debug view.",
    version="3.1.0"
)

# Enable CORS for local testing if frontend is served on Vite dev port 5173
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session store for multi-turn conversations
# Session format: { session_id: { "role": str, "history": List[Dict], "summary": str } }
SESSION_STORE: Dict[str, Dict] = {}

class ChatRequest(BaseModel):
    message: str
    role: str = Field(default=ROLE_CUSTOMER)
    session_id: Optional[str] = None
    prompt_version_id: Optional[str] = None
    context_budget: int = Field(default=DEFAULT_CONTEXT_BUDGET, ge=200, le=5000)
    summarize_threshold: int = Field(default=DEFAULT_SUMMARIZE_THRESHOLD, ge=1, le=20)
    # Note: client API key removed for server-side security

class ResetRequest(BaseModel):
    session_id: Optional[str] = None

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Context-Aware Support Assistant",
        "default_budget": DEFAULT_CONTEXT_BUDGET,
        "default_summarize_threshold": DEFAULT_SUMMARIZE_THRESHOLD,
        "active_sessions": len(SESSION_STORE)
    }

@app.get("/api/prompts")
def get_prompts(role: Optional[str] = None):
    """Returns available versioned prompts, optionally filtered by role."""
    return {
        "prompts": prompt_manager.list_prompts(role=role)
    }

@app.get("/api/documents")
def get_documents(role: str = Query(default=ROLE_CUSTOMER)):
    """
    Returns support documents filtered strictly by role:
    - Customer: Only public support documents.
    - Support Agent: Customer + internal operational SOPs.
    Never exposes internal document content to customers.
    """
    clean_role = role.lower().strip()
    if clean_role not in ALLOWED_ROLES:
        clean_role = ROLE_CUSTOMER

    return {
        "role": clean_role,
        "documents": document_retriever.get_documents_for_role(clean_role)
    }

@app.get("/api/sample-queries")
def get_sample_queries():
    """Returns verified sample queries grounded in the actual support documents."""
    return {
        "customer": [
            "What is your return and refund policy?",
            "How long does standard shipping take?",
            "Can I cancel my order before dispatch?",
            "How do I report a damaged item?"
        ],
        "support_agent": [
            "What is the refund override authorization code?",
            "What is the Tier-2 supervisor escalation hotline?",
            "What is the fraud checklist for multiple return claims?",
            "How do I troubleshoot carrier tracking stuck on label created?"
        ]
    }

@app.post("/api/chat")
def chat_endpoint(payload: ChatRequest):
    """
    Main chat endpoint executing the full context-aware pipeline.
    Validates role consistency, prompt versioning, and enforces context budget.
    """
    if not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    clean_role = payload.role.lower().strip()
    if clean_role not in ALLOWED_ROLES:
        clean_role = ROLE_CUSTOMER

    session_id = payload.session_id or str(uuid.uuid4())

    # Session consistency check:
    # If the session already exists but role changed, reset session history for the new role!
    if session_id in SESSION_STORE:
        existing_session = SESSION_STORE[session_id]
        if existing_session.get("role") != clean_role:
            print(f"[Main] Role switch detected on session '{session_id}' ({existing_session.get('role')} -> {clean_role}). Resetting session history.")
            existing_session["history"] = []
            existing_session["summary"] = ""
            existing_session["role"] = clean_role
    else:
        SESSION_STORE[session_id] = {
            "role": clean_role,
            "history": [],
            "summary": ""
        }

    session_data = SESSION_STORE[session_id]
    session_history = session_data["history"]
    existing_summary = session_data.get("summary", "")

    # Execute 10-step context-aware pipeline
    result = assistant_pipeline.run(
        user_role=clean_role,
        user_question=payload.message,
        conversation_history=session_history,
        prompt_version_id=payload.prompt_version_id,
        existing_summary=existing_summary,
        context_budget=payload.context_budget,
        summarize_threshold=payload.summarize_threshold
    )

    # Append turns to session history
    session_history.append({"role": "user", "content": payload.message})
    session_history.append({"role": "assistant", "content": result["answer"]})
    session_data["summary"] = result.get("summary_text", existing_summary)

    return {
        "session_id": session_id,
        "role": clean_role,
        "answer": result["answer"],
        "debug_view": result["debug_view"],
        "history_count": len(session_history)
    }

@app.post("/api/reset")
def reset_endpoint(payload: ResetRequest):
    """Resets the conversation history for a given session."""
    session_id = payload.session_id
    if session_id and session_id in SESSION_STORE:
        SESSION_STORE[session_id]["history"] = []
        SESSION_STORE[session_id]["summary"] = ""
        return {"status": "reset", "session_id": session_id, "message": "History cleared"}
    return {"status": "cleared", "message": "No active session to clear"}

# Mount frontend static directory (serves Vite production build if present)
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"
FRONTEND_DIST = FRONTEND_DIR / "dist"

if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")
elif FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
