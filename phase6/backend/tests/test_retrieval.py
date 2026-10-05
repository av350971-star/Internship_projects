from models.memory_models import MemoryCreate


def test_relevance_scoring_and_filtering(memory_manager, memory_retriever):
    user_id = "USER-RETRIEVAL"

    # Memory 1: Highly relevant to Python explanation
    m1 = memory_manager.create_memory(
        MemoryCreate(
            memory_type="preference",
            content="User prefers step-by-step Python explanations.",
            confidence=0.98,
            importance=0.85
        ),
        user_id=user_id
    )

    # Memory 2: Low confidence memory
    m2 = memory_manager.create_memory(
        MemoryCreate(
            memory_type="preference",
            content="User prefers Python 3.12 over 3.11",
            confidence=0.50,  # Below 0.70 threshold!
            importance=0.60
        ),
        user_id=user_id
    )

    # Memory 3: Unrelated memory (database topic)
    m3 = memory_manager.create_memory(
        MemoryCreate(
            memory_type="episodic",
            content="User encountered SQLite locked database error previously.",
            confidence=0.90,
            importance=0.70
        ),
        user_id=user_id
    )

    # Test Query 1: "Explain this Python function step by step"
    results = memory_retriever.retrieve(
        query="Explain this Python function step by step",
        user_id=user_id
    )

    # Find evaluation for m1
    res_m1 = next(r for r in results if r.memory.id == m1.id)
    assert res_m1.is_eligible is True
    assert res_m1.relevance_score >= 0.70
    assert res_m1.final_score >= 0.60
    assert res_m1.rejection_reason is None

    # Find evaluation for m2 (rejected due to low confidence)
    res_m2 = next(r for r in results if r.memory.id == m2.id)
    assert res_m2.is_eligible is False
    assert "Below confidence threshold" in (res_m2.rejection_reason or "")

    # Test Query 2: Irrelevant query ("What is the capital of France?")
    irrelevant_results = memory_retriever.retrieve(
        query="What is the capital of France?",
        user_id=user_id
    )
    res_m1_irrelevant = next(r for r in irrelevant_results if r.memory.id == m1.id)
    assert res_m1_irrelevant.is_eligible is False
    assert "Below relevance threshold" in (res_m1_irrelevant.rejection_reason or "")
