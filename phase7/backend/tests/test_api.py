from fastapi.testclient import TestClient
from app import app, JOBS
from agent import create_new_state


client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["ok"] is True


def test_start_research_validation_error():
    # Empty topic
    response = client.post("/api/research", json={"topic": "   "})
    assert response.status_code == 422


from unittest.mock import patch


def test_start_research_success():
    with patch("app.execute_job_task"):
        response = client.post("/api/research", json={"topic": "Artificial Intelligence in Medicine"})
        assert response.status_code == 201
        data = response.json()
        assert "job_id" in data
        assert data["message"] == "Research started successfully"



def test_get_status_not_found():
    response = client.get("/api/status/nonexistent123")
    assert response.status_code == 404


def test_get_status_found():
    # Insert mock job
    job_id = "testjob1"
    state = create_new_state("Test Topic")
    state.status = "done"
    state.report = "# Finished Report"
    JOBS[job_id] = state

    response = client.get(f"/api/status/{job_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["job_id"] == job_id
    assert data["status"] == "done"
    assert data["report"] == "# Finished Report"
    assert "tokens_used" in data
    assert "token_budget" in data
