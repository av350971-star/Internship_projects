from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from models.memory_models import Memory, MemoryCreate, MemoryUpdate
from models.response_models import RememberRequest, ForgetRequest
from api.deps import get_current_user_id, memory_manager, memory_extractor

router = APIRouter(prefix="/api/memory", tags=["Memory"])


@router.post("", response_model=Memory, status_code=201)
def create_memory(
    data: MemoryCreate,
    user_id: str = Depends(get_current_user_id)
):
    """
    Explicitly creates or deduplicates a long-term memory for the authenticated user.
    """
    return memory_manager.create_memory(
        data=data,
        user_id=user_id,
        session_id=None,
        deduplicate=True
    )


@router.get("", response_model=List[Memory])
def list_memories(
    status: Optional[str] = Query(default="active"),
    memory_type: Optional[str] = Query(default=None),
    user_id: str = Depends(get_current_user_id)
):
    """
    Returns user-visible memories with status and category filtering.
    """
    return memory_manager.list_memories(
        user_id=user_id,
        status=status,
        memory_type=memory_type
    )


@router.get("/{memory_id}", response_model=Memory)
def get_memory(
    memory_id: str,
    user_id: str = Depends(get_current_user_id)
):
    mem = memory_manager.get_memory(memory_id=memory_id, user_id=user_id)
    if not mem:
        raise HTTPException(status_code=404, detail="Memory not found")
    return mem


@router.put("/{memory_id}", response_model=Memory)
def update_memory(
    memory_id: str,
    update: MemoryUpdate,
    user_id: str = Depends(get_current_user_id)
):
    mem = memory_manager.update_memory(memory_id=memory_id, user_id=user_id, update=update)
    if not mem:
        raise HTTPException(status_code=404, detail="Memory not found")
    return mem


@router.delete("/{memory_id}")
def delete_memory(
    memory_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """
    Soft-deletes a memory (status='deleted').
    Excludes it from future context injection while preserving audit history.
    """
    success = memory_manager.delete_memory(memory_id=memory_id, user_id=user_id, soft=True)
    if not success:
        raise HTTPException(status_code=404, detail="Memory not found")
    return {"status": "deleted", "memory_id": memory_id}


@router.post("/remember", response_model=Memory)
def remember_explicit(
    req: RememberRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    Dedicated endpoint for explicit user memory creation.
    """
    mem_type = req.memory_type or "preference"
    create_dto = MemoryCreate(
        memory_type=mem_type,
        content=req.content,
        source="user_explicit",
        confidence=req.confidence or 0.95,
        importance=req.importance or 0.85
    )
    return memory_manager.create_memory(
        data=create_dto,
        user_id=user_id,
        deduplicate=True
    )


@router.post("/forget")
def forget_explicit(
    req: ForgetRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    Dedicated endpoint for explicit memory removal.
    Can delete by specific memory_id or match query.
    """
    if req.memory_id:
        success = memory_manager.delete_memory(memory_id=req.memory_id, user_id=user_id, soft=True)
        if not success:
            raise HTTPException(status_code=404, detail="Memory not found")
        return {"status": "forgotten", "memory_id": req.memory_id}

    if req.query:
        decision = memory_extractor.handle_explicit_forget(req.query, user_id=user_id)
        if decision.action == "DELETE":
            return {
                "status": "forgotten",
                "memory_id": decision.memory_id,
                "content": decision.content,
                "reason": decision.reason
            }
        else:
            raise HTTPException(status_code=404, detail="No matching memory found to forget")

    raise HTTPException(status_code=400, detail="Must provide query or memory_id to forget")
