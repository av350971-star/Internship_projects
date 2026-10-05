import pytest
from fastapi.testclient import TestClient
from main import app
from api.deps import memory_manager, session_manager, audit_service


@pytest.fixture
def client():
    return TestClient(app)


def test_section_38_complete_cross_session_demo_workflow(client):
    user_headers = {"X-User-ID": "USER-DEMO-WORKFLOW"}

    # Clean any prior state for this test user
    for m in memory_manager.list_memories("USER-DEMO-WORKFLOW", status=None):
        memory_manager.delete_memory(m.id, "USER-DEMO-WORKFLOW", soft=False)

    # ----------------------------------------------------
    # STEP 1: Session 1 — User specifies preference
    # ----------------------------------------------------
    resp1 = client.post(
        "/api/personalized/chat",
        json={"message": "Remember that I prefer step-by-step Python explanations."},
        headers=user_headers
    )
    assert resp1.status_code == 200
    data1 = resp1.json()
    session_id_1 = data1["session_id"]
    assert "Memory saved" in data1["answer"]

    # Verify memory was persisted in long-term store
    memories = memory_manager.list_memories("USER-DEMO-WORKFLOW", status="active")
    assert len(memories) == 1
    pref_memory = memories[0]
    assert pref_memory.memory_type == "preference"
    assert "step-by-step" in pref_memory.content.lower()

    # ----------------------------------------------------
    # STEP 2: Reset Session — Conversation history is wiped, memory remains
    # ----------------------------------------------------
    reset_resp = client.post(
        f"/api/session/reset?session_id={session_id_1}",
        headers=user_headers
    )
    assert reset_resp.status_code == 200
    reset_data = reset_resp.json()
    assert reset_data["status"] == "reset_complete"
    assert reset_data["memories_preserved_count"] == 1

    # Verify session messages are wiped
    sess_check = client.get(f"/api/session/current?session_id={session_id_1}", headers=user_headers)
    assert len(sess_check.json()["messages"]) == 0

    # Verify long-term memory is still safely in DB
    memories_after_reset = memory_manager.list_memories("USER-DEMO-WORKFLOW", status="active")
    assert len(memories_after_reset) == 1

    # ----------------------------------------------------
    # STEP 3: Session 2 — Relevant query triggers memory retrieval & injection
    # ----------------------------------------------------
    resp3 = client.post(
        "/api/personalized/chat",
        json={"message": "Explain this Python function.", "session_id": session_id_1},
        headers=user_headers
    )
    assert resp3.status_code == 200
    data3 = resp3.json()

    # Verify memory statistics
    assert data3["memory"]["retrieved"] >= 1
    assert data3["memory"]["eligible"] >= 1
    assert data3["memory"]["injected"] >= 1
    assert len(data3["memory_context"]) >= 1
    assert data3["memory_context"][0]["memory_id"] == pref_memory.id

    # Verify answer formatted in step-by-step structure
    assert "step" in data3["answer"].lower()

    # ----------------------------------------------------
    # STEP 4: Irrelevant Query — Memory is evaluated but REJECTED (below threshold)
    # ----------------------------------------------------
    resp4 = client.post(
        "/api/personalized/chat",
        json={"message": "What is the capital of France?", "session_id": session_id_1},
        headers=user_headers
    )
    assert resp4.status_code == 200
    data4 = resp4.json()

    # Evaluated (retrieved) but rejected by relevance filter
    assert data4["memory"]["retrieved"] >= 1
    assert data4["memory"]["injected"] == 0
    assert len(data4["memory_context"]) == 0
    assert "Paris" in data4["answer"]

    # ----------------------------------------------------
    # STEP 5: Delete Memory — Subsequent queries no longer retrieve or inject it
    # ----------------------------------------------------
    del_resp = client.delete(f"/api/memory/{pref_memory.id}", headers=user_headers)
    assert del_resp.status_code == 200

    resp5 = client.post(
        "/api/personalized/chat",
        json={"message": "Explain this Python function.", "session_id": session_id_1},
        headers=user_headers
    )
    assert resp5.status_code == 200
    data5 = resp5.json()

    # Soft deleted memory must NOT be retrieved or injected
    assert data5["memory"]["retrieved"] == 0
    assert data5["memory"]["injected"] == 0
    assert len(data5["memory_context"]) == 0
