"""
Models for execution logging and audit tracking.
"""
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class ExecutionLog(BaseModel):
    """Execution log entry capturing every attempted tool call."""
    execution_id: str = Field(..., description="Unique execution log identifier (e.g. EXEC-10001)")
    timestamp: str = Field(..., description="ISO timestamp of invocation")
    user_id: str = Field(..., description="Invoking user ID (e.g. CUST-1001)")
    role: str = Field(..., description="Role of the user (customer, support_agent, admin)")
    tool: str = Field(..., description="Name of the invoked tool")
    raw_arguments: Dict[str, Any] = Field(default_factory=dict, description="Original arguments supplied by LLM/caller")
    validated_arguments: Optional[Dict[str, Any]] = Field(default=None, description="Pydantic validated arguments, if passed")
    validation_status: str = Field(..., description="Status of validation: 'PASSED', 'FAILED', or 'SKIPPED'")
    authorization: Dict[str, Any] = Field(default_factory=dict, description="Authorization check result e.g. {'allowed': bool, 'reason': ...}")
    approval: Dict[str, Any] = Field(default_factory=dict, description="Approval check result e.g. {'required': bool, 'status': ...}")
    result: Optional[Any] = Field(default=None, description="Output returned by tool handler on success")
    error: Optional[Dict[str, Any]] = Field(default=None, description="Error details on failure: {'type': str, 'message': str}")
    elapsed_ms: float = Field(..., description="Total execution time in milliseconds")
