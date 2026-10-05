from typing import List, Dict, Any, Optional, Literal
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    id: str
    role: Literal["user", "assistant", "system"]
    content: str
    timestamp: str
    metadata: Optional[Dict[str, Any]] = None


class SessionState(BaseModel):
    session_id: str
    user_id: str
    messages: List[ChatMessage] = Field(default_factory=list)
    current_task: Optional[str] = None
    temporary_state: Dict[str, Any] = Field(default_factory=dict)
    created_at: str
    updated_at: str
