"""
Integration tests for FastAPI endpoints:
- POST /api/operations/chat
- GET /api/tools
- GET /api/executions
- GET /api/approvals
- POST /api/approvals/{approval_id}/approve
- POST /api/approvals/{approval_id}/reject
- POST /api/operations/reset
- GET /api/health
"""
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


class TestApiEndpoints:
    def setup_method(self):
        client.post("/api/operations/reset")

    def test_health_check(self):
        resp = client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
        assert data["registered_tools_count"] == 5

    def test_list_tools_endpoint(self):
        resp = client.get("/api/tools")
        assert resp.status_code == 200
        tools = resp.json()
        assert len(tools) == 5
        names = [t["name"] for t in tools]
        assert "search_knowledge" in names
        assert "calculator" in names
        assert "lookup_customer" in names
        assert "create_ticket" in names
        assert "send_mock_email" in names

        # Verify JSON Schema is exposed
        for t in tools:
            assert "input_schema" in t
            assert "properties" in t["input_schema"]

    def test_chat_search_knowledge(self):
        resp = client.post("/api/operations/chat", json={
            "message": "What is our refund policy?",
            "role": "customer",
            "customer_id": "CUST-1001"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "refund" in data["answer"].lower()
        assert len(data["execution_ids"]) > 0

    def test_chat_side_effect_approval_flow(self):
        # 1. Chat requesting a ticket
        resp = client.post("/api/operations/chat", json={
            "message": "Create a ticket for my delayed order ORD-5002.",
            "role": "customer",
            "customer_id": "CUST-1001"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["pending_approval"] is not None
        appr_id = data["pending_approval"]["approval_id"]

        # 2. Check pending approvals list
        appr_resp = client.get("/api/approvals?status=pending")
        assert appr_resp.status_code == 200
        apprs = appr_resp.json()
        assert any(a["approval_id"] == appr_id for a in apprs)

        # 3. Approve the ticket
        action_resp = client.post(f"/api/approvals/{appr_id}/approve", json={"reason": "Verified delayed delivery"})
        assert action_resp.status_code == 200
        res_data = action_resp.json()
        assert res_data["success"] is True
        assert res_data["status"] == "approved"
        assert res_data["execution_result"]["result"]["ticket_id"].startswith("TCK-")

    def test_chat_unauthorized_action(self):
        # Customer trying to send mock email
        resp = client.post("/api/operations/chat", json={
            "message": "Send an email to support@example.com",
            "role": "customer",
            "customer_id": "CUST-1001"
        })
        assert resp.status_code == 200
        # Check executions log
        execs_resp = client.get("/api/executions")
        assert execs_resp.status_code == 200
        logs = execs_resp.json()
        assert any(l["tool"] == "send_mock_email" and l["authorization"]["allowed"] is False for l in logs)

    def test_chat_order_support_summary_workflow(self):
        resp = client.post("/api/operations/chat", json={
            "message": "Check customer CUST-1001's orders and calculate the total order amount.",
            "role": "customer",
            "customer_id": "CUST-1001"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["structured_output"] is not None
        assert data["structured_output"]["workflow"] == "order_support_summary"
        assert data["structured_output"]["total_amount"] == 2450.0

    def test_invalid_role_rejected(self):
        resp = client.post("/api/operations/chat", json={
            "message": "Hello",
            "role": "unauthorized_hacker",
            "customer_id": "CUST-1001"
        })
        assert resp.status_code == 422
        err = resp.json()
        assert err["success"] is False
        assert err["error"]["type"] == "VALIDATION_ERROR"
