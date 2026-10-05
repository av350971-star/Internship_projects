"""
Approval Service managing requests, decisions, and lifecycle for side-effect tool calls.
"""
import datetime
import random
from typing import Any, Dict, List, Optional
from models.approval_models import ApprovalRequest, ApprovalStatus


class ApprovalService:
    def __init__(self):
        self._approvals: Dict[str, ApprovalRequest] = {}

    def create_approval(
        self,
        tool: str,
        user_id: str,
        user_role: str,
        arguments: Dict[str, Any]
    ) -> ApprovalRequest:
        """Create a new pending approval record."""
        approval_id = f"APR-{random.randint(10000, 99999)}"
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

        approval = ApprovalRequest(
            approval_id=approval_id,
            tool=tool,
            user_id=user_id,
            user_role=user_role,
            arguments=arguments,
            status="pending",
            created_at=now_iso,
            updated_at=None,
            decision_reason=None
        )
        self._approvals[approval_id] = approval
        return approval

    def get_approval(self, approval_id: str) -> Optional[ApprovalRequest]:
        """Retrieve an approval by ID."""
        return self._approvals.get(approval_id)

    def list_approvals(self, status: Optional[ApprovalStatus] = None) -> List[ApprovalRequest]:
        """List all approvals, optionally filtered by status."""
        approvals = list(self._approvals.values())
        if status:
            approvals = [a for a in approvals if a.status == status]
        # Return newest first
        approvals.sort(key=lambda a: a.created_at, reverse=True)
        return approvals

    def approve(self, approval_id: str, reason: Optional[str] = None) -> ApprovalRequest:
        """Mark a pending approval as approved."""
        approval = self._approvals.get(approval_id)
        if not approval:
            raise KeyError(f"Approval request '{approval_id}' not found.")
        if approval.status != "pending":
            raise ValueError(f"Approval '{approval_id}' is already {approval.status}.")

        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        approval.status = "approved"
        approval.updated_at = now_iso
        approval.decision_reason = reason or "Approved by operator."
        return approval

    def reject(self, approval_id: str, reason: Optional[str] = None) -> ApprovalRequest:
        """Mark a pending approval as rejected."""
        approval = self._approvals.get(approval_id)
        if not approval:
            raise KeyError(f"Approval request '{approval_id}' not found.")
        if approval.status != "pending":
            raise ValueError(f"Approval '{approval_id}' is already {approval.status}.")

        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        approval.status = "rejected"
        approval.updated_at = now_iso
        approval.decision_reason = reason or "Rejected by operator."
        return approval

    def reset(self) -> None:
        """Reset all in-memory approvals."""
        self._approvals.clear()


# Global singleton instance
approval_service = ApprovalService()
