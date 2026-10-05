"""
API endpoints for managing human-in-the-loop approvals for side-effect tools.
"""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from models.approval_models import ApprovalRequest, ApprovalActionResponse, ApprovalStatus
from services.approval_service import approval_service
from services.tool_executor import execute_tool
from services.execution_logger import execution_logger

router = APIRouter(prefix="/api/approvals", tags=["Approvals"])


class DecisionPayload(BaseModel):
    reason: Optional[str] = None


@router.get("", response_model=List[ApprovalRequest])
def list_approvals(status: Optional[ApprovalStatus] = Query(default=None)):
    """List all approval requests, optionally filtered by status (pending, approved, rejected)."""
    return approval_service.list_approvals(status=status)


@router.get("/{approval_id}", response_model=ApprovalRequest)
def get_approval_by_id(approval_id: str):
    """Fetch details of an approval request by ID."""
    appr = approval_service.get_approval(approval_id)
    if not appr:
        raise HTTPException(status_code=404, detail=f"Approval request '{approval_id}' not found.")
    return appr


@router.post("/{approval_id}/approve", response_model=ApprovalActionResponse)
def approve_request(approval_id: str, payload: Optional[DecisionPayload] = None):
    """
    Approves a pending side-effect action and executes the underlying tool.
    """
    reason = payload.reason if payload else None
    try:
        updated_appr = approval_service.approve(approval_id, reason=reason)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Approval request '{approval_id}' not found.")
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

    # Execute the underlying side-effect tool now that approval is confirmed
    exec_result = execute_tool(
        tool_name=updated_appr.tool,
        raw_arguments=updated_appr.arguments,
        user_context={
            "user_id": updated_appr.user_id,
            "role": updated_appr.user_role
        },
        approved_approval_id=approval_id
    )

    return ApprovalActionResponse(
        success=exec_result.get("success", False),
        approval_id=approval_id,
        status="approved",
        message=f"Approval granted. Tool '{updated_appr.tool}' was executed.",
        execution_result=exec_result
    )


@router.post("/{approval_id}/reject", response_model=ApprovalActionResponse)
def reject_request(approval_id: str, payload: Optional[DecisionPayload] = None):
    """
    Rejects a pending side-effect action. The tool handler is guaranteed NOT to run.
    """
    reason = payload.reason if payload else None
    try:
        updated_appr = approval_service.reject(approval_id, reason=reason)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Approval request '{approval_id}' not found.")
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

    # Log the rejected decision in execution audit
    execution_logger.record(
        user_id=updated_appr.user_id,
        role=updated_appr.user_role,
        tool=updated_appr.tool,
        raw_arguments=updated_appr.arguments,
        validated_arguments=updated_appr.arguments,
        validation_status="PASSED",
        authorization={"allowed": True},
        approval={"required": True, "status": "rejected", "approval_id": approval_id},
        result=None,
        error={"type": "APPROVAL_REJECTED", "message": f"Execution rejected by operator: {updated_appr.decision_reason}"},
        elapsed_ms=0.0
    )

    return ApprovalActionResponse(
        success=True,
        approval_id=approval_id,
        status="rejected",
        message=f"Approval request '{approval_id}' was rejected. Action aborted.",
        execution_result=None
    )
