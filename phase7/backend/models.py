"""
Pydantic data models for Research Agent State, Findings, Sources, and API Schemas.
Enforces validation and serialization throughout the agent lifecycle.
"""

from pydantic import BaseModel, Field, HttpUrl, field_validator
from typing import Literal, Optional
from datetime import datetime, timezone


class Finding(BaseModel):
    """Structured research finding with verified source citation."""
    claim: str = Field(..., description="Fact or finding extracted from research")
    source: str = Field(..., description="URL of the source where claim was found")
    snippet: Optional[str] = Field(default=None, description="Original source context snippet")
    confidence: Optional[float] = Field(default=1.0, ge=0.0, le=1.0, description="Extraction confidence score")


class SourceRecord(BaseModel):
    """Detailed record of an accessed web source."""
    url: str = Field(..., description="Source URL")
    title: str = Field(default="", description="Page or search result title")
    snippet: str = Field(default="", description="Extracted snippet or search summary")
    accessed_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat(), description="Timestamp of retrieval")


class ResearchState(BaseModel):
    """
    Explicit, strongly-typed research agent state.
    Enforces step budgets, token/cost budgets, queue management, and deduplication.
    """
    topic: str = Field(..., description="The user's research topic")
    status: Literal["idle", "running", "done", "failed"] = Field(default="idle", description="Current status")
    
    # Bounded execution & Step Budget
    steps_used: int = Field(default=0, ge=0, description="Total agent actions taken")
    max_steps: int = Field(default=8, ge=1, description="Upper bound on total steps")
    
    # Cost & Token Budget
    tokens_used: int = Field(default=0, ge=0, description="Total tokens consumed across read & LLM calls")
    token_budget: int = Field(default=12000, ge=100, description="Maximum token budget")
    estimated_cost_usd: float = Field(default=0.0, ge=0.0, description="Estimated total cost in USD")
    
    # Tool specific counts
    search_calls: int = Field(default=0, ge=0, description="Number of web search calls performed")
    max_search_calls: int = Field(default=4, ge=1, description="Search call ceiling")
    pages_read: int = Field(default=0, ge=0, description="Number of web pages read")
    max_pages_to_read: int = Field(default=6, ge=1, description="Page reading ceiling")
    
    # Deduplication and Queues
    queries_done: list[str] = Field(default_factory=list, description="List of search queries already performed")
    urls_seen: list[str] = Field(default_factory=list, description="List of URLs already discovered or visited")
    read_queue: list[str] = Field(default_factory=list, description="Queue of URLs pending reading")
    read_queue_empty: bool = Field(default=False, description="Flag indicating read queue is exhausted")
    
    # Findings and Sources
    findings: list[Finding] = Field(default_factory=list, description="Structured extracted findings")
    source_records: list[SourceRecord] = Field(default_factory=list, description="Detailed records of accessed sources")
    
    # Evaluator & Reporting
    evaluator_passes: int = Field(default=0, ge=0, description="Number of extra retrieval passes granted by evaluator")
    max_evaluator_passes: int = Field(default=1, ge=0, description="Max extra passes permitted")
    report: str = Field(default="", description="Final synthesized structured report in Markdown")
    
    # Observability
    logs: list[str] = Field(default_factory=list, description="Real-time chronological activity log events")
    error: Optional[str] = Field(default=None, description="Error message if failed")

    def has_budget(self) -> bool:
        """Returns True if both step budget and token budget remain."""
        return self.steps_used < self.max_steps and self.tokens_used < self.token_budget


# ---------------- API Request & Response Schemas ----------------

class ResearchRequest(BaseModel):
    """Input payload to initiate research."""
    topic: str = Field(..., min_length=2, max_length=300, description="Topic or question to research")

    @field_validator("topic")
    def clean_topic(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Topic cannot be empty or only whitespace")
        return cleaned


class ResearchResponse(BaseModel):
    """Response returned upon starting a research job."""
    job_id: str = Field(..., description="Unique ID for tracking the job")
    message: str = Field(..., description="Status message")


class StatusResponse(BaseModel):
    """Real-time job status response matching frontend requirements."""
    job_id: str
    status: Literal["idle", "running", "done", "failed"]
    steps_used: int
    max_steps: int
    tokens_used: int
    token_budget: int
    estimated_cost_usd: float
    findings: list[Finding]
    logs: list[str]
    report: str
    error: Optional[str] = None
