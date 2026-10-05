import pytest
from pydantic import ValidationError
from models.memory_models import MemoryCreate, MemoryUpdate


def test_memory_crud_operations(memory_manager):
    user_id = "USER-TEST-1"

    # 1. Create
    create_dto = MemoryCreate(
        memory_type="preference",
        content="User prefers step-by-step explanations.",
        source="user_explicit",
        confidence=0.98,
        importance=0.85
    )
    mem = memory_manager.create_memory(create_dto, user_id=user_id)
    assert mem.id.startswith("MEM-")
    assert mem.user_id == user_id
    assert mem.memory_type == "preference"
    assert mem.content == "User prefers step-by-step explanations."
    assert mem.confidence == 0.98
    assert mem.status == "active"

    # 2. Read
    fetched = memory_manager.get_memory(mem.id, user_id=user_id)
    assert fetched is not None
    assert fetched.id == mem.id
    assert fetched.content == mem.content

    # 3. Update
    update_dto = MemoryUpdate(
        content="User prefers detailed step-by-step explanations.",
        importance=0.90
    )
    updated = memory_manager.update_memory(mem.id, user_id=user_id, update=update_dto)
    assert updated is not None
    assert updated.content == "User prefers detailed step-by-step explanations."
    assert updated.importance == 0.90
    assert updated.confidence == 0.98  # Unchanged

    # 4. Soft Delete
    deleted = memory_manager.delete_memory(mem.id, user_id=user_id, soft=True)
    assert deleted is True

    # Check that it's marked as deleted
    mem_after_del = memory_manager.get_memory(mem.id, user_id=user_id)
    assert mem_after_del is not None
    assert mem_after_del.status == "deleted"

    # Active listing does NOT include deleted memories
    active_list = memory_manager.list_memories(user_id=user_id, status="active")
    assert len(active_list) == 0


def test_memory_categories(memory_manager):
    user_id = "USER-TEST-2"

    semantic = memory_manager.create_memory(
        MemoryCreate(memory_type="semantic", content="User is learning Python", confidence=0.90),
        user_id=user_id
    )
    episodic = memory_manager.create_memory(
        MemoryCreate(memory_type="episodic", content="User previously built an LLM Playground", confidence=0.85),
        user_id=user_id
    )
    preference = memory_manager.create_memory(
        MemoryCreate(memory_type="preference", content="User prefers concise code", confidence=0.95),
        user_id=user_id
    )

    assert semantic.memory_type == "semantic"
    assert episodic.memory_type == "episodic"
    assert preference.memory_type == "preference"

    # Filter by category
    sem_list = memory_manager.list_memories(user_id=user_id, memory_type="semantic")
    assert len(sem_list) == 1
    assert sem_list[0].id == semantic.id


def test_pydantic_validation():
    # Confidence > 1.0 must fail
    with pytest.raises(ValidationError):
        MemoryCreate(
            memory_type="preference",
            content="Invalid confidence",
            confidence=1.5
        )

    # Invalid category must fail
    with pytest.raises(ValidationError):
        MemoryCreate(
            memory_type="unknown_category",  # type: ignore
            content="Invalid type",
            confidence=0.9
        )
