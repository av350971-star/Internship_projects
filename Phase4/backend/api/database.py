"""
API endpoints for inspecting mock database and emails state.
Useful for live dashboard demonstrations of side-effect execution.
"""
import json
import sqlite3
from pathlib import Path
from fastapi import APIRouter
from tools.lookup_customer import DB_PATH
from tools.send_mock_email import EMAILS_FILE

router = APIRouter(prefix="/api/database", tags=["Database"])


@router.get("/inspect")
def inspect_database():
    """Inspect current records in customers, orders, tickets tables and mock_emails.json."""
    customers = []
    orders = []
    tickets = []
    emails = []

    if DB_PATH.exists():
        conn = sqlite3.connect(str(DB_PATH))
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT * FROM customers")
            customers = [dict(row) for row in cursor.fetchall()]

            cursor.execute("SELECT * FROM orders ORDER BY order_date DESC")
            orders = [dict(row) for row in cursor.fetchall()]

            cursor.execute("SELECT * FROM tickets ORDER BY created_at DESC")
            tickets = [dict(row) for row in cursor.fetchall()]
        finally:
            conn.close()

    if EMAILS_FILE.exists():
        try:
            with open(EMAILS_FILE, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if content:
                    emails = json.loads(content)
        except Exception:
            emails = []

    return {
        "customers": customers,
        "orders": orders,
        "tickets": tickets,
        "mock_emails": emails
    }
