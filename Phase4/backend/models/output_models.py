"""
Output and request/response models for chat operations and workflows.
"""
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


class OrderSupportSummary(BaseModel):
    """Structured output model for the order support workflow."""
    workflow: str = "order_support_summary"
    customer_id: str
    orders_found: int
    total_amount: float
    currency: str = "INR"
    tools_used: List[str]
    status: Literal["completed", "failed"]


class ChatRequest(BaseModel):
    """Incoming user chat request."""
    message: str = Field(..., min_length=1, description="User prompt or instructions")
    role: Literal["customer", "support_agent", "admin"] = Field(
        default="customer",
        description="User role strictly restricted to customer, support_agent, or admin"
    )
    customer_id: str = Field(
        default="CUST-1001",
        pattern=r"^CUST-[0-9]{4,8}$",
        description="ID of the current active customer context"
    )
    session_id: Optional[str] = Field(default=None, description="Optional conversational session ID")


class ChatResponse(BaseModel):
    """Standardized response from the assistant orchestrator."""
    answer: str
    tool_calls: List[Dict[str, Any]] = Field(default_factory=list)
    pending_approval: Optional[Dict[str, Any]] = None
    execution_ids: List[str] = Field(default_factory=list)
    structured_output: Optional[Dict[str, Any]] = None
    error: Optional[Dict[str, Any]] = None
