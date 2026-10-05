import pytest
from fastapi.testclient import TestClient
from main import app
from api.deps import memory_manager, session_manager, audit_service, context_builder, memory_retriever
from models.memory_models import MemoryCreate, MemoryUpdate


@pytest.fixture
def client():
    return TestClient(app)


def test_preference_update_and_context_injection_lifecycle(client):
    """
    CRITICAL REGRESSION TEST:
    1. Create 'User prefers concise answers.'
    2. Verify context builder injects concise preference.
    3. Update to 'User prefers detailed answers.'
    4. Verify DB contains detailed preference and old preference is deactivated.
    5. Verify retrieval returns detailed preference and old is NOT injected.
    6. Verify audit event for update.
    """
    user_id = "USER-PREF-UPDATE-TEST"
    user_headers = {"X-User-ID": user_id}

    # Clean prior state
    for m in memory_manager.list_memories(user_id, status=None):
        memory_manager.delete_memory(m.id, user_id, soft=False)

    # 1. Create initial preference: concise
    mem_concise = memory_manager.create_memory(
        data=MemoryCreate(
            memory_type="preference",
            content="User prefers concise answers.",
            confidence=0.95,
            importance=0.80,
            source="user_explicit"
        ),
        user_id=user_id,
        session_id="session-pref-1"
    )
    assert mem_concise.status == "active"
    concise_id = mem_concise.id

    # 2. Check context building with initial preference
    session1 = session_manager.get_or_create_session(session_id="session-pref-1", user_id=user_id)
    retrieval1 = memory_retriever.retrieve("Can you explain how async works?", user_id=user_id, session_id="session-pref-1")
    prompt1, injected1, stats1, _ = context_builder.build_context(
        user_message="Can you explain how async works?",
        session_state=session1,
        retrieval_results=retrieval1,
        user_id=user_id
    )
    injected_ids_1 = [m.memory_id for m in injected1]
    assert concise_id in injected_ids_1
    assert any("concise" in m.content.lower() for m in injected1)

    # 3. Update preference to detailed via API (simulating user editing memory in UI)
    update_resp = client.put(
        f"/api/memory/{concise_id}",
        json={
            "content": "User prefers detailed answers.",
            "confidence": 0.95,
            "importance": 0.85
        },
        headers=user_headers
    )
    assert update_resp.status_code == 200
    updated_data = update_resp.json()
    assert "detailed" in updated_data["content"].lower()

    # 4. Verify database record
    updated_mem = memory_manager.get_memory(concise_id, user_id=user_id)
    assert updated_mem is not None
    assert updated_mem.content == "User prefers detailed answers."
    assert updated_mem.status == "active"

    # 5. Check subsequent retrieval and context building
    retrieval2 = memory_retriever.retrieve("Can you explain how async works?", user_id=user_id, session_id="session-pref-2")
    session2 = session_manager.get_or_create_session(session_id="session-pref-2", user_id=user_id)
    prompt2, injected2, stats2, _ = context_builder.build_context(
        user_message="Can you explain how async works?",
        session_state=session2,
        retrieval_results=retrieval2,
        user_id=user_id
    )
    injected_contents_2 = [m.content.lower() for m in injected2]
    # Verify new detailed preference is injected
    assert any("detailed" in c for c in injected_contents_2)
    # Verify old concise preference is NOT injected
    assert not any("concise" in c for c in injected_contents_2)

    # 6. Verify audit event was logged
    audit_logs = audit_service.get_audit_logs(user_id=user_id, limit=50)
    update_logs = [l for l in audit_logs if l.event_type == "updated" and l.memory_id == concise_id]
    assert len(update_logs) >= 1
    assert "detailed" in str(update_logs[0].reason).lower()


def test_preference_conflict_resolution(client):
    """
    Test conflicting instructions:
    Create 'User prefers short responses.'
    Then create 'User prefers detailed responses.'
    System must resolve conflict:
    - Only the newest preference remains active
    - The conflicting older preference is deactivated/soft-deleted
    - Both are NEVER injected simultaneously
    """
    user_id = "USER-CONFLICT-TEST"
    for m in memory_manager.list_memories(user_id, status=None):
        memory_manager.delete_memory(m.id, user_id, soft=False)

    # 1. Create short responses preference
    mem_short = memory_manager.create_memory(
        data=MemoryCreate(
            memory_type="preference",
            content="User prefers short responses.",
            confidence=0.95,
            importance=0.80,
            source="user_explicit"
        ),
        user_id=user_id,
        session_id="sess-conflict-1"
    )
    short_id = mem_short.id

    # 2. Create conflicting detailed responses preference
    mem_detailed = memory_manager.create_memory(
        data=MemoryCreate(
            memory_type="preference",
            content="User prefers detailed responses.",
            confidence=0.95,
            importance=0.85,
            source="user_explicit"
        ),
        user_id=user_id,
        session_id="sess-conflict-2"
    )
    detailed_id = mem_detailed.id

    # Check active memories in DB
    active_mems = memory_manager.list_memories(user_id, status="active")
    # Old short response should be deactivated by conflict resolver
    assert any(m.id == detailed_id for m in active_mems)
    assert not any(m.id == short_id for m in active_mems)

    # Verify retrieval only retrieves the active one
    retrieval = memory_retriever.retrieve("Please explain closures.", user_id=user_id, session_id="sess-conflict-3")
    session3 = session_manager.get_or_create_session(session_id="sess-conflict-3", user_id=user_id)
    prompt, injected, stats, _ = context_builder.build_context(
        user_message="Please explain closures.",
        session_state=session3,
        retrieval_results=retrieval,
        user_id=user_id
    )

    injected_ids = [m.memory_id for m in injected]
    assert detailed_id in injected_ids
    assert short_id not in injected_ids


def test_cross_session_preference_behavior_change(client):
    """
    Manual end-to-end multi-session test:
    A. Set preference A (concise).
    B. Start Session 1.
    C. Ask query -> check injected context has concise.
    D. Update preference to B (detailed) via API.
    E. Start Session 2 (distinct session ID).
    F. Ask query -> check injected context has detailed and NOT concise.
    """
    user_id = "USER-E2E-SESSIONS"
    headers = {"X-User-ID": user_id}

    for m in memory_manager.list_memories(user_id, status=None):
        memory_manager.delete_memory(m.id, user_id, soft=False)

    # A. Set preference A
    create_resp = client.post(
        "/api/memory",
        json={
            "memory_type": "preference",
            "content": "User prefers concise answers.",
            "confidence": 0.95,
            "importance": 0.80
        },
        headers=headers
    )
    assert create_resp.status_code == 201
    pref_id = create_resp.json()["id"]

    # B & C. Session 1: Ask query
    chat1 = client.post(
        "/api/personalized/chat",
        json={"message": "Can you explain Python decorators?", "session_id": "session-e2e-1"},
        headers=headers
    )
    assert chat1.status_code == 200
    injected_1 = [m["content"] for m in chat1.json()["memory_context"]]
    assert any("concise" in c.lower() for c in injected_1)

    # D. Change preference to B
    update_resp = client.put(
        f"/api/memory/{pref_id}",
        json={
            "content": "User prefers detailed answers.",
            "confidence": 0.95,
            "importance": 0.85
        },
        headers=headers
    )
    assert update_resp.status_code == 200

    # E & F. Session 2 (brand new session ID)
    chat2 = client.post(
        "/api/personalized/chat",
        json={"message": "Can you explain Python decorators?", "session_id": "session-e2e-2"},
        headers=headers
    )
    assert chat2.status_code == 200
    injected_2 = [m["content"] for m in chat2.json()["memory_context"]]
    assert any("detailed" in c.lower() for c in injected_2)
    assert not any("concise" in c.lower() for c in injected_2)
