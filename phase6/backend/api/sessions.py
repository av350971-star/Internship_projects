from typing import Optional
from fastapi import APIRouter, Depends, Query
from models.session_models import SessionState
from models.response_models import SessionResetResponse
from api.deps import get_current_user_id, session_manager, memory_manager

router = APIRouter(prefix="/api/session", tags=["Session"])


@router.get("/current", response_model=SessionState)
def get_current_session(
    session_id: Optional[str] = Query(default=None),
    user_id: str = Depends(get_current_user_id)
):
    """
    Returns the current ephemeral session state, or initializes a new one.
    """
    return session_manager.get_or_create_session(session_id=session_id, user_id=user_id)


@router.post("/reset", response_model=SessionResetResponse)
def reset_session(
    session_id: Optional[str] = Query(default=None),
    user_id: str = Depends(get_current_user_id)
):
    """
    Resets ephemeral session state (messages and temporary variables).
    CRITICAL: Long-term memories are strictly preserved in data/memory.db.
    """
    active_session = session_manager.get_or_create_session(session_id=session_id, user_id=user_id)
    session_manager.reset_session(session_id=active_session.session_id, user_id=user_id)

    # Count preserved active long-term memories
    preserved_count = len(memory_manager.list_memories(user_id=user_id, status="active"))

    return SessionResetResponse(
        status="reset_complete",
        message="Session conversation history wiped. Long-term memories preserved intact.",
        session_id=active_session.session_id,
        memories_preserved_count=preserved_count
    )
