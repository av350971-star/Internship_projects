"""
Tests for Role-Based Authorization Layer.
"""
from services.authorization import authorize


class TestAuthorization:
    def test_customer_allowed_read_tools(self):
        # Customer can search knowledge and use calculator
        ok, reason = authorize("customer", "search_knowledge", {"query": "refunds"}, "CUST-1001")
        assert ok is True
        assert reason is None

        ok, reason = authorize("customer", "calculator", {"expression": "100 + 50"}, "CUST-1001")
        assert ok is True
        assert reason is None

    def test_customer_lookup_self_allowed(self):
        # Customer looking up own record
        ok, reason = authorize("customer", "lookup_customer", {"customer_id": "CUST-1001"}, "CUST-1001")
        assert ok is True
        assert reason is None

    def test_customer_lookup_other_rejected(self):
        # Customer looking up another customer must be strictly blocked
        ok, reason = authorize("customer", "lookup_customer", {"customer_id": "CUST-1002"}, "CUST-1001")
        assert ok is False
        assert "Access Denied" in reason

    def test_customer_create_ticket_self_allowed(self):
        ok, reason = authorize(
            "customer",
            "create_ticket",
            {"customer_id": "CUST-1001", "subject": "test", "description": "1234567890"},
            "CUST-1001"
        )
        assert ok is True

    def test_customer_create_ticket_other_rejected(self):
        ok, reason = authorize(
            "customer",
            "create_ticket",
            {"customer_id": "CUST-1002", "subject": "test", "description": "1234567890"},
            "CUST-1001"
        )
        assert ok is False
        assert "Access Denied" in reason

    def test_customer_send_email_forbidden(self):
        # Customer role must NEVER be allowed to send emails
        ok, reason = authorize(
            "customer",
            "send_mock_email",
            {"to": "test@example.com", "subject": "hello", "body": "test"},
            "CUST-1001"
        )
        assert ok is False
        assert "forbidden" in reason.lower() or "not authorized" in reason.lower()

    def test_support_agent_permissions(self):
        # Support agent can look up any customer
        ok, _ = authorize("support_agent", "lookup_customer", {"customer_id": "CUST-1002"}, "CUST-1001")
        assert ok is True

        # Support agent can create ticket for any customer
        ok, _ = authorize("support_agent", "create_ticket", {"customer_id": "CUST-1002"}, "CUST-1001")
        assert ok is True

        # Support agent can send mock email
        ok, _ = authorize("support_agent", "send_mock_email", {"to": "cust@example.com"}, "CUST-1001")
        assert ok is True

    def test_admin_permissions(self):
        # Admin can access all tools
        for tool in ["search_knowledge", "calculator", "lookup_customer", "create_ticket", "send_mock_email"]:
            ok, _ = authorize("admin", tool, {"customer_id": "CUST-9999"}, "CUST-1001")
            assert ok is True

    def test_untrusted_arbitrary_role_rejected(self):
        # Reject unknown roles like "superuser", "guest", "hacker"
        ok, reason = authorize("superuser", "calculator", {"expression": "2+2"}, "CUST-1001")
        assert ok is False
        assert "Invalid role" in reason
