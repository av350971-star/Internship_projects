"""
API endpoints for tool discovery and JSON Schema inspection.
"""
from typing import Any, Dict, List
from fastapi import APIRouter
from services.tool_registry import get_tools_metadata

router = APIRouter(prefix="/api/tools", tags=["Tools"])


@router.get("", response_model=List[Dict[str, Any]])
def list_registered_tools():
    """
    Returns public metadata and full Pydantic JSON Schema for all registered tools.
    """
    return get_tools_metadata()
