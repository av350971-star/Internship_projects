"""
Tests for Pydantic input models and AST validation.
"""
import pytest
from pydantic import ValidationError

from models.tool_models import (
    CalculatorInput,
    LookupCustomerInput,
    CreateTicketInput,
    SendMockEmailInput,
    SearchKnowledgeInput
)
from tools.calculator import calculator


class TestCalculatorValidation:
    def test_valid_calculator_inputs(self):
        # Valid math expressions
        cases = ["250 * 4 + 100", "1250.0 + 1200.0", "(10 + 20) * 3", "100 / 4", "5 - -3"]
        for expr in cases:
            validated = CalculatorInput(expression=expr)
            assert validated.expression == expr
            res = calculator(expr)
            assert res["status"] == "success"

    def test_calculator_rejection_code_injection(self):
        # Disallowed imports, functions, attribute access
        malicious = [
            "__import__('os').system('ls')",
            "open('/etc/passwd').read()",
            "eval('2+2')",
            "exec('x = 1')",
            "lambda x: x + 1",
            "sum([1, 2, 3])"
        ]
        for bad in malicious:
            with pytest.raises(ValueError):
                calculator(bad)

    def test_calculator_division_by_zero(self):
        with pytest.raises(ValueError, match="Division by zero"):
            calculator("100 / 0")


class TestCustomerLookupValidation:
    def test_valid_customer_id(self):
        valid = LookupCustomerInput(customer_id="CUST-1001", include_orders=True)
        assert valid.customer_id == "CUST-1001"
        assert valid.include_orders is True

    def test_invalid_customer_id_format(self):
        invalid_ids = ["wrong-id", "CUST-1", "1001", "CUST-ABCD", "cust-1001", "CUST-1234567890"]
        for bad_id in invalid_ids:
            with pytest.raises(ValidationError):
                LookupCustomerInput(customer_id=bad_id)


class TestTicketValidation:
    def test_valid_ticket(self):
        ticket = CreateTicketInput(
            customer_id="CUST-1001",
            subject="Delayed shipping notification",
            description="My package has not moved from the origin warehouse for 5 days.",
            priority="high"
        )
        assert ticket.priority == "high"

    def test_invalid_ticket_subject_too_short(self):
        with pytest.raises(ValidationError):
            CreateTicketInput(
                customer_id="CUST-1001",
                subject="",  # min_length 3
                description="Valid description with enough characters.",
                priority="low"
            )

    def test_invalid_ticket_description_too_short(self):
        with pytest.raises(ValidationError):
            CreateTicketInput(
                customer_id="CUST-1001",
                subject="Valid Subject",
                description="short",  # min_length 10
                priority="medium"
            )

    def test_invalid_priority_value(self):
        with pytest.raises(ValidationError):
            CreateTicketInput(
                customer_id="CUST-1001",
                subject="Valid Subject",
                description="Valid description with enough characters.",
                priority="urgent"  # Only 'low', 'medium', 'high'
            )


class TestEmailValidation:
    def test_valid_email(self):
        email = SendMockEmailInput(
            to="user@example.com",
            subject="Delivery Status Update",
            body="Your shipment is now in transit."
        )
        assert str(email.to) == "user@example.com"

    def test_invalid_email_format(self):
        with pytest.raises(ValidationError):
            SendMockEmailInput(
                to="not-an-email",
                subject="Status",
                body="Body message"
            )


class TestSearchKnowledgeValidation:
    def test_valid_search(self):
        search = SearchKnowledgeInput(query="refund policy", limit=5)
        assert search.query == "refund policy"
        assert search.limit == 5

    def test_search_query_too_short(self):
        with pytest.raises(ValidationError):
            SearchKnowledgeInput(query="a")  # min_length 2

    def test_search_limit_bounds(self):
        with pytest.raises(ValidationError):
            SearchKnowledgeInput(query="test", limit=0)  # ge 1
        with pytest.raises(ValidationError):
            SearchKnowledgeInput(query="test", limit=15)  # le 10
