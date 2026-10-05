from typing import Literal, Optional
from pydantic import BaseModel, Field


class Memory(BaseModel):
    id: str
    user_id: str
    memory_type: Literal[
        "semantic",
        "episodic",
        "preference",
        "procedural"
    ]

    content: str

    source: str

    confidence: float = Field(
        ge=0.0,
        le=1.0
    )

    importance: float = Field(
        ge=0.0,
        le=1.0
    )

    created_at: str
    updated_at: str

    last_retrieved_at: Optional[str] = None

    retrieval_count: int = 0

    status: Literal[
        "active",
        "deleted",
        "archived"
    ] = "active"


class MemoryCreate(BaseModel):
    memory_type: Literal["semantic", "episodic", "preference", "procedural"]
    content: str
    source: str = "user_explicit"
    confidence: float = Field(default=0.95, ge=0.0, le=1.0)
    importance: float = Field(default=0.80, ge=0.0, le=1.0)
    user_id: Optional[str] = None


class MemoryUpdate(BaseModel):
    content: Optional[str] = None
    memory_type: Optional[Literal["semantic", "episodic", "preference", "procedural"]] = None
    source: Optional[str] = None
    confidence: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    importance: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    status: Optional[Literal["active", "deleted", "archived"]] = None


class MemoryRetrievalResult(BaseModel):
    memory: Memory
    relevance_score: float
    confidence: float
    importance: float
    final_score: float
    is_eligible: bool
    rejection_reason: Optional[str] = None
