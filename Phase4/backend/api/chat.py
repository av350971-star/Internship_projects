"""
API endpoints for operations assistant chat interaction and workspace reset.
"""
from fastapi import APIRouter
from models.output_models import ChatRequest, ChatResponse
from services.orchestrator import orchestrator
from services.approval_service import approval_service
from services.execution_logger import execution_logger
from data.db_init import reset_db
from tools.send_mock_email import EMAILS_FILE
import json

router = APIRouter(prefix="/api/operations", tags=["Operations"])


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Main conversational endpoint: processes user query through the secure tool-calling pipeline.
    """
    response = await orchestrator.process_chat(
        message=request.message,
        role=request.role,
        customer_id=request.customer_id,
        session_id=request.session_id
    )
    return response


@router.post("/reset")
def reset_operations(session_id: str = "default"):
    """
    Resets conversational memory, approval requests, execution logs, and database records.
    """
    orchestrator.reset_session(session_id)
    approval_service.reset()
    execution_logger.reset()
    reset_db()

    # Clear mock emails
    try:
        with open(EMAILS_FILE, "w", encoding="utf-8") as f:
            json.dump([], f)
    except Exception:
        pass

    return {
        "success": True,
        "message": "Assistant state, memory, execution logs, and operations DB reset to initial state."
    }
