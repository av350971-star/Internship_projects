"""
Tests for Approval System and Side-Effect Protection.
"""
import sqlite3
from services.tool_executor import execute_tool
from services.approval_service import approval_service
from tools.lookup_customer import DB_PATH


class TestApprovalWorkflow:
    def setup_method(self):
        approval_service.reset()

    def test_create_ticket_halts_for_approval(self):
        # Trigger create_ticket without prior approval
        result = execute_tool(
            tool_name="create_ticket",
            raw_arguments={
                "customer_id": "CUST-1001",
                "subject": "Missing delivery item",
                "description": "The outer packaging was torn and missing contents.",
                "priority": "high"
            },
            user_context={"role": "customer", "user_id": "CUST-1001"}
        )

        assert result["success"] is False
        assert result["pending_approval"] is not None
        assert "requires user approval" in result["message"]

        # Verify approval record was created in pending state
        appr_id = result["pending_approval"]["approval_id"]
        appr = approval_service.get_approval(appr_id)
        assert appr is not None
        assert appr.status == "pending"

    def test_send_mock_email_halts_for_approval(self):
        result = execute_tool(
            tool_name="send_mock_email",
            raw_arguments={
                "to": "alice@example.com",
                "subject": "Order Confirmation",
                "body": "Your order has shipped."
            },
            user_context={"role": "support_agent", "user_id": "CUST-1001"}
        )

        assert result["success"] is False
        assert result["pending_approval"] is not None
        assert result["pending_approval"]["tool"] == "send_mock_email"

    def test_approved_ticket_executes_and_inserts_to_db(self):
        # 1. Initiate ticket call
        args = {
            "customer_id": "CUST-1001",
            "subject": "Approved ticket subject",
            "description": "Detailed explanation of the issue for customer.",
            "priority": "medium"
        }
        res1 = execute_tool(
            tool_name="create_ticket",
            raw_arguments=args,
            user_context={"role": "customer", "user_id": "CUST-1001"}
        )
        appr_id = res1["pending_approval"]["approval_id"]

        # 2. Approve the request
        approval_service.approve(appr_id, reason="Customer verified issue")

        # 3. Re-execute with approved ID
        res2 = execute_tool(
            tool_name="create_ticket",
            raw_arguments=args,
            user_context={"role": "customer", "user_id": "CUST-1001"},
            approved_approval_id=appr_id
        )

        assert res2["success"] is True
        assert res2["result"]["status"] == "open"
        ticket_id = res2["result"]["ticket_id"]

        # Verify row actually exists in SQLite tickets table
        conn = sqlite3.connect(str(DB_PATH))
        cursor = conn.cursor()
        cursor.execute("SELECT ticket_id, subject FROM tickets WHERE ticket_id = ?", (ticket_id,))
        row = cursor.fetchone()
        conn.close()

        assert row is not None
        assert row[0] == ticket_id

    def test_rejected_ticket_does_not_execute(self):
        args = {
            "customer_id": "CUST-1001",
            "subject": "Rejected ticket subject",
            "description": "This ticket was rejected and should never be created.",
            "priority": "low"
        }
        res1 = execute_tool(
            tool_name="create_ticket",
            raw_arguments=args,
            user_context={"role": "customer", "user_id": "CUST-1001"}
        )
        appr_id = res1["pending_approval"]["approval_id"]

        # Reject the request
        approval_service.reject(appr_id, reason="Duplicate ticket submitted")

        # Attempt to execute with rejected ID
        res2 = execute_tool(
            tool_name="create_ticket",
            raw_arguments=args,
            user_context={"role": "customer", "user_id": "CUST-1001"},
            approved_approval_id=appr_id
        )

        assert res2["success"] is False
        assert res2["error"]["type"] == "APPROVAL_ERROR"
        assert "status is 'rejected'" in res2["error"]["message"]
