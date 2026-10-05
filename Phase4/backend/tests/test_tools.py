"""
Unit tests for individual tool handlers.
"""
import json
from pathlib import Path
from tools.search_knowledge import search_knowledge
from tools.calculator import calculator
from tools.lookup_customer import lookup_customer
from tools.create_ticket import create_ticket
from tools.send_mock_email import send_mock_email, EMAILS_FILE


class TestIndividualTools:
    def test_search_knowledge_refund_policy(self):
        res = search_knowledge(query="refund policy", limit=2)
        assert res["results_count"] > 0
        top = res["results"][0]
        assert "refund" in top["title"].lower() or "refund" in top["content"].lower()

    def test_search_knowledge_category_filter(self):
        res = search_knowledge(query="shipping", category="shipping")
        for article in res["results"]:
            assert article["category"].lower() == "shipping"

    def test_calculator_arithmetic_precedence(self):
        # 250 * 4 + 100 = 1000 + 100 = 1100
        res = calculator("250 * 4 + 100")
        assert res["result"] == 1100
        assert res["status"] == "success"

    def test_calculator_parentheses_and_floats(self):
        res = calculator("(1250.5 + 1200.5) * 2")
        assert res["result"] == 4902.0

    def test_lookup_customer_found_with_orders(self):
        res = lookup_customer("CUST-1001", include_orders=True)
        assert res["found"] is True
        assert res["customer"]["customer_id"] == "CUST-1001"
        assert res["customer"]["name"] == "Alice Smith"
        assert res["orders_count"] == 2
        assert len(res["orders"]) == 2

    def test_lookup_customer_not_found(self):
        res = lookup_customer("CUST-9999", include_orders=False)
        assert res["found"] is False

    def test_create_ticket_handler(self):
        res = create_ticket(
            customer_id="CUST-1001",
            subject="Damaged shipment package",
            description="The shipment box arrived with dented edges.",
            priority="low"
        )
        assert res["success"] is True
        assert res["ticket_id"].startswith("TCK-")
        assert res["status"] == "open"

    def test_send_mock_email_handler(self):
        res = send_mock_email(
            to="alice@example.com",
            subject="Important update on your inquiry",
            body="Thank you for reaching out to customer support."
        )
        assert res["success"] is True
        assert res["mode"] == "MOCK EMAIL"
        assert res["email_id"].startswith("EMAIL-")

        # Verify disk persistence in mock_emails.json
        with open(EMAILS_FILE, "r", encoding="utf-8") as f:
            emails = json.load(f)
        matched = any(e["email_id"] == res["email_id"] for e in emails)
        assert matched is True
