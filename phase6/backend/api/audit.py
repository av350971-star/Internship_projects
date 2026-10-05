from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from models.response_models import AuditRecord
from api.deps import get_current_user_id, audit_service

router = APIRouter(prefix="/api/memory/audit", tags=["Audit"])


@router.get("", response_model=List[AuditRecord])
def get_audit_trail(
    limit: int = Query(default=100, ge=1, le=500),
    memory_id: Optional[str] = Query(default=None),
    event_type: Optional[str] = Query(default=None),
    user_id: str = Depends(get_current_user_id)
):
    """
    Returns chronological audit log of all memory events (retrieved, injected, rejected, created, updated, deleted).
    """
    return audit_service.get_audit_logs(
        user_id=user_id,
        limit=limit,
        memory_id=memory_id,
        event_type=event_type
    )


@router.get("/{memory_id}", response_model=List[AuditRecord])
def get_memory_audit(
    memory_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """
    Returns audit trail for a specific memory item.
    """
    return audit_service.get_audit_logs(
        user_id=user_id,
        limit=100,
        memory_id=memory_id
    )
