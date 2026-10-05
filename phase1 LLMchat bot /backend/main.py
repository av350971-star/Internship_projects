import os
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, status
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend import config
from backend import storage
from backend import llm_client

app = FastAPI(
    title="LLM Playground API",
    description="A transparent, educational LLM Playground backend exposing raw model interactions, metrics, and multi-turn sessions.",
    version="1.0.0"
)

# Enable CORS for local development flexibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------------------
# Request/Response Pydantic Schemas
# ------------------------------------------------------------------------------
class CreateSessionRequest(BaseModel):
    title: Optional[str] = "New Chat"
    system_prompt: Optional[str] = config.DEFAULT_SYSTEM_PROMPT
    model: Optional[str] = config.DEFAULT_MODEL
    temperature: Optional[float] = config.DEFAULT_TEMPERATURE

class UpdateSessionRequest(BaseModel):
    title: Optional[str] = None
    system_prompt: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = None

class ChatRequest(BaseModel):
    session_id: str
    message: str = Field(..., min_length=1, description="User's prompt message")
    system_prompt: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = None
    api_key_override: Optional[str] = None
    base_url_override: Optional[str] = None

# ------------------------------------------------------------------------------
# API Endpoints
# ------------------------------------------------------------------------------

@app.get("/api/config")
def get_configuration():
    """Returns application configuration, supported models, and pricing."""
    has_key = bool(config.LLM_API_KEY and config.LLM_API_KEY != "your_api_key_here")
    masked_key = ""
    if has_key:
        masked_key = ("*" * 8) + config.LLM_API_KEY[-4:] if len(config.LLM_API_KEY) > 4 else "****"

    return {
        "base_url": config.LLM_BASE_URL,
        "has_api_key": has_key,
        "masked_api_key": masked_key,
        "default_model": config.DEFAULT_MODEL,
        "default_temperature": config.DEFAULT_TEMPERATURE,
        "default_system_prompt": config.DEFAULT_SYSTEM_PROMPT,
        "system_prompts": config.SYSTEM_PROMPTS,
        "models": config.MODELS_CATALOG
    }

@app.get("/api/sessions")
def get_all_sessions():
    """List all saved sessions with metadata."""
    return storage.list_sessions()

@app.post("/api/sessions", status_code=status.HTTP_201_CREATED)
def create_new_session(req: CreateSessionRequest):
    """Create a new chat session."""
    session = storage.create_session(
        title=req.title,
        system_prompt=req.system_prompt,
        model=req.model,
        temperature=req.temperature
    )
    return session

@app.get("/api/sessions/{session_id}")
def get_single_session(session_id: str):
    """Retrieve full conversation history for a specific session."""
    session = storage.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found.")
    return session

@app.put("/api/sessions/{session_id}")
def update_session(session_id: str, req: UpdateSessionRequest):
    """Update session title, system prompt, or model parameters."""
    session = storage.update_session(
        session_id=session_id,
        title=req.title,
        system_prompt=req.system_prompt,
        model=req.model,
        temperature=req.temperature
    )
    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found.")
    return session

@app.delete("/api/sessions/{session_id}")
def delete_session(session_id: str):
    """Delete a session by ID."""
    deleted = storage.delete_session(session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found.")
    return {"status": "success", "message": f"Session '{session_id}' deleted."}

@app.post("/api/sessions/{session_id}/reset")
def reset_session(session_id: str):
    """Reset / clear all messages in a session while preserving configuration."""
    session = storage.reset_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found.")
    return {"status": "success", "message": "Session conversation history cleared.", "session": session}

@app.post("/api/chat")
async def chat_interaction(req: ChatRequest):
    """
    Main Chat Turn Handler:
    1. Loads session history.
    2. Builds raw messages payload (system prompt + multi-turn history + user input).
    3. Sends direct HTTP request to the LLM.
    4. Records metrics (latency, prompt/completion tokens, cost).
    5. Saves turn in server-side storage and returns response.
    """
    session = storage.get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{req.session_id}' not found.")

    # Determine effective parameters (request overrides > session values > defaults)
    valid_model_ids = [m["id"] for m in config.MODELS_CATALOG]
    if req.model and req.model in valid_model_ids:
        effective_model = req.model
    elif session.get("model") in valid_model_ids:
        effective_model = session.get("model")
    else:
        effective_model = config.DEFAULT_MODEL

    effective_system_prompt = req.system_prompt if req.system_prompt is not None else session.get("system_prompt", config.DEFAULT_SYSTEM_PROMPT)
    effective_temperature = req.temperature if req.temperature is not None else session.get("temperature", config.DEFAULT_TEMPERATURE)

    # Persist the active model and system prompt in session storage
    storage.update_session(req.session_id, model=effective_model, system_prompt=effective_system_prompt, temperature=effective_temperature)

    # 1. Append user message to server session
    user_msg_entry = {
        "role": "user",
        "content": req.message.strip(),
        "timestamp": datetime.now().isoformat()
    }
    storage.add_message(req.session_id, user_msg_entry)

    # 2. Build multi-turn context array for the LLM
    # Raw LLM format starts with System Prompt (index 0) followed by history turns
    llm_messages = []
    if effective_system_prompt and effective_system_prompt.strip():
        llm_messages.append({
            "role": "system",
            "content": effective_system_prompt.strip()
        })

    # Add sliding window of recent messages (keeps prompt compact and drastically cuts latency!)
    updated_session = storage.get_session(req.session_id)
    all_msgs = updated_session.get("messages", [])
    # Keep last 6 turns (3 user + 3 assistant) so prompt tokens don't balloon
    recent_msgs = all_msgs[-6:] if len(all_msgs) > 6 else all_msgs
    for msg in recent_msgs:
        llm_messages.append({
            "role": msg["role"],
            "content": msg["content"]
        })

    # 3. Call LLM directly (measure latency & capture token usage)
    try:
        llm_result = await llm_client.call_llm(
            messages=llm_messages,
            model=effective_model,
            temperature=effective_temperature,
            api_key=req.api_key_override,
            base_url=req.base_url_override
        )
    except PermissionError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ResourceWarning as e:
        raise HTTPException(status_code=429, detail=str(e))
    except (ValueError, TimeoutError, ConnectionError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM Provider Error: {str(e)}")

    # 4. Save assistant response into session
    assistant_msg_entry = {
        "role": "assistant",
        "content": llm_result["content"],
        "timestamp": datetime.now().isoformat(),
        "metrics": llm_result["metrics"]
    }
    storage.add_message(req.session_id, assistant_msg_entry)

    # Auto-generate meaningful session title if it's the first message and title is default
    if len(updated_session.get("messages", [])) <= 2 and session.get("title", "").startswith("New Chat"):
        new_title = req.message.strip()[:28] + ("..." if len(req.message.strip()) > 28 else "")
        storage.update_session(req.session_id, title=new_title)

    return {
        "status": "success",
        "session_id": req.session_id,
        "message": assistant_msg_entry,
        "raw_request": llm_result["raw_request"],
        "raw_response": llm_result["raw_response"]
    }

# ------------------------------------------------------------------------------
# Mount Frontend Static Files
# ------------------------------------------------------------------------------
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
DIST_DIR = os.path.join(FRONTEND_DIR, "dist")
if os.path.exists(DIST_DIR):
    app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="frontend")
elif os.path.exists(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
