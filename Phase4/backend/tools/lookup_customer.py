"""
Tool 3: lookup_customer
Reads customer and order records from SQLite data/operations.db using strictly parameterized queries.
"""
import sqlite3
from pathlib import Path
from typing import Any, Dict, List

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "operations.db"


def lookup_customer(customer_id: str, include_orders: bool = False) -> Dict[str, Any]:
    """
    Look up customer profile and optionally their orders using parameterized SQL queries.
    Never uses raw string concatenation for SQL execution.
    """
    if not DB_PATH.exists():
        raise FileNotFoundError(f"Operations database does not exist at {DB_PATH}")

    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        # Parameterized query for customer record
        cursor.execute(
            "SELECT customer_id, name, email, phone, membership_tier, created_at FROM customers WHERE customer_id = ?",
            (customer_id,)
        )
        customer_row = cursor.fetchone()

        if not customer_row:
            return {
                "found": False,
                "customer_id": customer_id,
                "message": f"No customer found with ID {customer_id}"
            }

        customer_data = dict(customer_row)
        orders_data: List[Dict[str, Any]] = []

        if include_orders:
            # Parameterized query for orders
            cursor.execute(
                "SELECT order_id, customer_id, order_date, total_amount, currency, status, items_summary "
                "FROM orders WHERE customer_id = ? ORDER BY order_date DESC",
                (customer_id,)
            )
            order_rows = cursor.fetchall()
            orders_data = [dict(row) for row in order_rows]

        return {
            "found": True,
            "customer_id": customer_id,
            "customer": customer_data,
            "include_orders": include_orders,
            "orders_count": len(orders_data) if include_orders else None,
            "orders": orders_data if include_orders else None
        }

    finally:
        conn.close()
