from models.memory_models import MemoryCreate


def test_user_memory_isolation(memory_manager, memory_retriever):
    user_a = "USER-1001"
    user_b = "USER-1002"

    # User A creates a memory
    mem_a = memory_manager.create_memory(
        MemoryCreate(
            memory_type="preference",
            content="User A prefers dark mode and concise output.",
            confidence=0.95
        ),
        user_id=user_a
    )

    # User B creates a memory
    mem_b = memory_manager.create_memory(
        MemoryCreate(
            memory_type="preference",
            content="User B prefers light mode and verbose output.",
            confidence=0.95
        ),
        user_id=user_b
    )

    # 1. Listing isolation
    memories_a = memory_manager.list_memories(user_id=user_a)
    memories_b = memory_manager.list_memories(user_id=user_b)

    assert len(memories_a) == 1
    assert memories_a[0].id == mem_a.id

    assert len(memories_b) == 1
    assert memories_b[0].id == mem_b.id

    # 2. Direct read isolation (User A cannot get User B's memory)
    assert memory_manager.get_memory(memory_id=mem_b.id, user_id=user_a) is None
    assert memory_manager.get_memory(memory_id=mem_a.id, user_id=user_b) is None

    # 3. Retrieval isolation: User B's query will NEVER retrieve User A's memory
    retrieved_for_b = memory_retriever.retrieve(query="What are my preferences?", user_id=user_b)
    retrieved_ids_b = [r.memory.id for r in retrieved_for_b]

    assert mem_a.id not in retrieved_ids_b
    assert mem_b.id in retrieved_ids_b
