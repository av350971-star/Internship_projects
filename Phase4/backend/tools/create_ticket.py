"""
Tool 4: create_ticket
Creates a support ticket in the operations SQLite database.
This is a SIDE-EFFECT tool requiring explicit human approval.
"""
import datetime
import random
import sqlite3
from pathlib import Path
from typing import Any, Dict, Literal

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "operations.db"


def create_ticket(
    customer_id: str,
    subject: str,
    description: str,
    priority: Literal["low", "medium", "high"] = "medium"
) -> Dict[str, Any]:
    """
    Inserts a newly approved support ticket into the SQLite tickets table.
    Uses parameterized SQL queries.
    """
    if not DB_PATH.exists():
        raise FileNotFoundError(f"Operations database does not exist at {DB_PATH}")

    # Generate a unique ticket ID
    ticket_id = f"TCK-{random.randint(1000, 9999)}"
    now_iso = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            INSERT INTO tickets (ticket_id, customer_id, subject, description, priority, status, created_at)
            VALUES (?, ?, ?, ?, ?, 'open', ?)
            """,
            (ticket_id, customer_id, subject, description, priority, now_iso)
        )
        conn.commit()

        return {
            "success": True,
            "ticket_id": ticket_id,
            "customer_id": customer_id,
            "subject": subject,
            "description": description,
            "priority": priority,
            "status": "open",
            "created_at": now_iso,
            "message": f"Support ticket {ticket_id} has been created successfully."
        }
    finally:
        conn.close()
