"""
Security and Boundary Tests.
Verifies that untrusted LLM outputs or frontend calls cannot bypass validation,
authorization, or approval requirements.
"""
import pytest
from services.tool_executor import execute_tool
from services.orchestrator import orchestrator
from models.output_models import OrderSupportSummary


class TestSecurityBoundaries:
    def test_llm_cannot_bypass_validation(self):
        # Malicious payload trying to inject code into calculator
        result = execute_tool(
            tool_name="calculator",
            raw_arguments={"expression": "__import__('os').system('echo pwned')"},
            user_context={"role": "admin", "user_id": "CUST-1001"}
        )
        assert result["success"] is False
        assert result["error"] is not None
        assert result["result"] is None

    def test_llm_cannot_bypass_authorization(self):
        # A prompt where LLM tries to call send_mock_email on behalf of a customer
        result = execute_tool(
            tool_name="send_mock_email",
            raw_arguments={
                "to": "victim@example.com",
                "subject": "Unauthorized email",
                "body": "This must not be allowed."
            },
            user_context={"role": "customer", "user_id": "CUST-1001"}
        )
        assert result["success"] is False
        assert result["error"]["type"] == "AUTHORIZATION_ERROR"

    def test_llm_cannot_bypass_approval(self):
        # A prompt where LLM attempts to execute create_ticket directly
        result = execute_tool(
            tool_name="create_ticket",
            raw_arguments={
                "customer_id": "CUST-1001",
                "subject": "Direct Ticket Execution Attempt",
                "description": "Attempting to bypass human approval pipeline.",
                "priority": "high"
            },
            user_context={"role": "customer", "user_id": "CUST-1001"}
        )
        # Handler must NOT have executed, but must yield a pending approval
        assert result["success"] is False
        assert result["pending_approval"] is not None
        assert result["result"] is None

    def test_unregistered_tool_rejected(self):
        result = execute_tool(
            tool_name="delete_all_records",
            raw_arguments={},
            user_context={"role": "admin", "user_id": "CUST-1001"}
        )
        assert result["success"] is False
        assert result["error"]["type"] == "UNKNOWN_TOOL_ERROR"

    @pytest.mark.asyncio
    async def test_order_support_summary_workflow(self):
        # End-to-end workflow: Look up customer orders, calculate sum, produce structured output
        orchestrator.reset_session("test_summary_session")
        response = await orchestrator.process_chat(
            message="Check customer CUST-1001's orders and calculate the total order amount.",
            role="customer",
            customer_id="CUST-1001",
            session_id="test_summary_session"
        )

        assert response.structured_output is not None
        summary = response.structured_output

        # Verify structured output schema compliance
        assert summary["workflow"] == "order_support_summary"
        assert summary["customer_id"] == "CUST-1001"
        assert summary["orders_found"] == 2
        # CUST-1001 has orders ORD-5001 (1250.0) + ORD-5002 (1200.0) = 2450.0 INR
        assert summary["total_amount"] == 2450.0
        assert summary["currency"] == "INR"
        assert "lookup_customer" in summary["tools_used"]
        assert "calculator" in summary["tools_used"]
        assert summary["status"] == "completed"
