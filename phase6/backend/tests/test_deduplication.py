from models.memory_models import MemoryCreate


def test_memory_deduplication(memory_manager):
    user_id = "USER-DEDUP"

    # Create original memory
    mem1 = memory_manager.create_memory(
        MemoryCreate(
            memory_type="preference",
            content="User prefers step-by-step explanations.",
            confidence=0.90,
            importance=0.80
        ),
        user_id=user_id
    )

    # Attempt to create near-identical memory
    mem2 = memory_manager.create_memory(
        MemoryCreate(
            memory_type="preference",
            content="User likes step-by-step explanations.",
            confidence=0.98,
            importance=0.85
        ),
        user_id=user_id,
        deduplicate=True
    )

    # Must reuse the same memory ID rather than creating a duplicate
    assert mem2.id == mem1.id

    # Total active memories for user should still be 1
    active_mems = memory_manager.list_memories(user_id=user_id, status="active")
    assert len(active_mems) == 1
    assert active_mems[0].id == mem1.id

    # Confidence should be upgraded to higher confidence
    assert active_mems[0].confidence == 0.98
