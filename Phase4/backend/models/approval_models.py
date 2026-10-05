"""
Data models for the approval management system.
"""
from typing import Any, Dict, Literal, Optional
from pydantic import BaseModel, Field


ApprovalStatus = Literal["pending", "approved", "rejected", "expired"]


class ApprovalRequest(BaseModel):
    """Represents a pending or resolved approval requirement for a side-effect tool."""
    approval_id: str = Field(..., description="Unique approval identifier, e.g. APR-10001")
    tool: str = Field(..., description="Name of the side-effect tool requiring authorization")
    user_id: str = Field(..., description="User ID requesting or owning the operation")
    user_role: str = Field(..., description="Role of the user triggering the action (customer, support_agent, admin)")
    arguments: Dict[str, Any] = Field(..., description="Validated or raw arguments for the pending tool invocation")
    status: ApprovalStatus = Field(default="pending", description="Current status of the approval request")
    created_at: str = Field(..., description="ISO timestamp when approval request was generated")
    updated_at: Optional[str] = Field(default=None, description="ISO timestamp of approval/rejection decision")
    decision_reason: Optional[str] = Field(default=None, description="Optional note or explanation for approval/rejection")


class ApprovalActionResponse(BaseModel):
    """Response returned when an approval is approved or rejected."""
    success: bool
    approval_id: str
    status: ApprovalStatus
    message: str
    execution_result: Optional[Dict[str, Any]] = None
