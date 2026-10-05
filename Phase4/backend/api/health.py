"""
Health check and system status endpoint.
"""
from fastapi import APIRouter
from services.tool_registry import TOOLS

router = APIRouter(tags=["Health"])


@router.get("/api/health")
def health_check():
    """Health check verifying operational availability and registered tools count."""
    return {
        "status": "healthy",
        "service": "Tool-Calling Operations Assistant",
        "version": "1.0.0",
        "registered_tools_count": len(TOOLS),
        "tools": list(TOOLS.keys())
    }
