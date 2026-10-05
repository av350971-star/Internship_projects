from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class InjectedMemorySummary(BaseModel):
    memory_id: str
    type: str
    content: str
    score: float
    confidence: float
    importance: float


class MemoryStats(BaseModel):
    retrieved: int = 0
    eligible: int = 0
    injected: int = 0
    rejected: int = 0


class MemoryDecisionSummary(BaseModel):
    action: Literal["CREATE", "UPDATE", "DELETE", "IGNORE"]
    memory_id: Optional[str] = None
    memory_type: Optional[str] = None
    content: Optional[str] = None
    confidence: Optional[float] = None
    reason: Optional[str] = None


class ChatResponse(BaseModel):
    answer: str
    session_id: str
    memory: MemoryStats
    memory_context: List[InjectedMemorySummary] = Field(default_factory=list)
    latency_ms: int
    decision_summary: Optional[MemoryDecisionSummary] = None


class RememberRequest(BaseModel):
    content: str
    memory_type: Optional[Literal["semantic", "episodic", "preference", "procedural"]] = "preference"
    confidence: Optional[float] = 0.95
    importance: Optional[float] = 0.85


class ForgetRequest(BaseModel):
    query: Optional[str] = None
    memory_id: Optional[str] = None


class AuditRecord(BaseModel):
    audit_id: str
    user_id: str
    memory_id: str
    event_type: Literal["created", "updated", "deleted", "retrieved", "injected", "rejected"]
    query: Optional[str] = None
    relevance_score: Optional[float] = None
    confidence: Optional[float] = None
    injected: bool = False
    reason: Optional[str] = None
    session_id: Optional[str] = None
    timestamp: str


class SessionResetResponse(BaseModel):
    status: str
    message: str
    session_id: str
    memories_preserved_count: int
