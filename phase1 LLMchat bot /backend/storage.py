import os
import json
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
SESSIONS_FILE = os.path.join(DATA_DIR, "sessions.json")

def _ensure_storage_ready():
    """Ensure data directory and sessions file exist with initial sessions."""
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(SESSIONS_FILE):
        # Pre-seed with at least 2 saved server-side sessions
        initial_sessions = {
            "session-general": {
                "id": "session-general",
                "title": "General Conversation",
                "system_prompt": "You are an expert programming tutor for BCA students. Explain concepts step-by-step with clean code snippets and concise explanations.",
                "model": "gemini-3.8-flash",
                "temperature": 0.7,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "messages": []
            },
            "session-coding": {
                "id": "session-coding",
                "title": "Python & Data Structures Tutor",
                "system_prompt": "You are an expert programming tutor for BCA students. Explain concepts step-by-step with clean code snippets and concise explanations.",
                "model": "gemini-3.8-flash",
                "temperature": 0.7,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
            }
        }
        with open(SESSIONS_FILE, "w", encoding="utf-8") as f:
            json.dump(initial_sessions, f, indent=2)

def _read_data() -> Dict[str, Any]:
    _ensure_storage_ready()
    try:
        with open(SESSIONS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}

def _write_data(data: Dict[str, Any]) -> None:
    _ensure_storage_ready()
    with open(SESSIONS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

def list_sessions() -> List[Dict[str, Any]]:
    """Return summary list of all stored sessions sorted by updated_at descending."""
    data = _read_data()
    sessions = []
    for s_id, s in data.items():
        total_tokens = sum(m.get("metrics", {}).get("total_tokens", 0) for m in s.get("messages", []))
        total_cost = sum(m.get("metrics", {}).get("estimated_cost", 0.0) for m in s.get("messages", []))
        sessions.append({
            "id": s_id,
            "title": s.get("title", "Untitled Session"),
            "system_prompt": s.get("system_prompt", ""),
            "model": s.get("model", "gpt-4o-mini"),
            "temperature": s.get("temperature", 0.7),
            "message_count": len(s.get("messages", [])),
            "total_tokens": total_tokens,
            "total_cost": round(total_cost, 6),
            "created_at": s.get("created_at"),
            "updated_at": s.get("updated_at")
        })
    # Sort newest first
    sessions.sort(key=lambda x: x.get("updated_at", ""), reverse=True)
    return sessions

def get_session(session_id: str) -> Optional[Dict[str, Any]]:
    """Get full session data by ID."""
    data = _read_data()
    return data.get(session_id)

def create_session(title: str, system_prompt: str, model: str = "gemini-3.8-flash", temperature: float = 0.7) -> Dict[str, Any]:
    """Create a new session."""
    data = _read_data()
    new_id = f"session-{uuid.uuid4().hex[:8]}"
    now = datetime.now().isoformat()
    new_session = {
        "id": new_id,
        "title": title or "New Conversation",
        "system_prompt": system_prompt,
        "model": model,
        "temperature": temperature,
        "created_at": now,
        "updated_at": now,
        "messages": []
    }
    data[new_id] = new_session
    _write_data(data)
    return new_session

def add_message(session_id: str, message: Dict[str, Any]) -> bool:
    """Add a message (user or assistant) to session history."""
    data = _read_data()
    if session_id not in data:
        return False
    if "messages" not in data[session_id]:
        data[session_id]["messages"] = []
    
    data[session_id]["messages"].append(message)
    data[session_id]["updated_at"] = datetime.now().isoformat()
    _write_data(data)
    return True

def reset_session(session_id: str) -> Optional[Dict[str, Any]]:
    """Reset/clear messages of a session while keeping system prompt and configs intact."""
    data = _read_data()
    if session_id not in data:
        return None
    data[session_id]["messages"] = []
    data[session_id]["updated_at"] = datetime.now().isoformat()
    _write_data(data)
    return data[session_id]

def update_session(session_id: str, title: Optional[str] = None, system_prompt: Optional[str] = None, model: Optional[str] = None, temperature: Optional[float] = None) -> Optional[Dict[str, Any]]:
    """Update session settings."""
    data = _read_data()
    if session_id not in data:
        return None
    
    if title is not None:
        data[session_id]["title"] = title
    if system_prompt is not None:
        data[session_id]["system_prompt"] = system_prompt
    if model is not None:
        data[session_id]["model"] = model
    if temperature is not None:
        data[session_id]["temperature"] = temperature
        
    data[session_id]["updated_at"] = datetime.now().isoformat()
    _write_data(data)
    return data[session_id]

def delete_session(session_id: str) -> bool:
    """Delete a session."""
    data = _read_data()
    if session_id in data:
        del data[session_id]
        _write_data(data)
        return True
    return False
