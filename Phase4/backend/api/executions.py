"""
API endpoints for inspecting tool execution audit logs.
"""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from models.execution_models import ExecutionLog
from services.execution_logger import execution_logger

router = APIRouter(prefix="/api/executions", tags=["Executions"])


@router.get("", response_model=List[ExecutionLog])
def list_execution_logs(limit: int = Query(default=100, ge=1, le=500)):
    """
    Retrieve chronological execution logs recording tool, arguments, validation,
    authorization, approval, and execution elapsed time.
    """
    return execution_logger.list_logs(limit=limit)


@router.get("/{execution_id}", response_model=ExecutionLog)
def get_execution_log(execution_id: str):
    """
    Retrieve an individual execution record by ID.
    """
    log = execution_logger.get_log(execution_id)
    if not log:
        raise HTTPException(status_code=404, detail=f"Execution log '{execution_id}' not found.")
    return log
