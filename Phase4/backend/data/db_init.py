"""
Database initialization and seeding script for Operations Assistant.
Creates tables for customers, orders, and tickets in data/operations.db.
"""
import os
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "operations.db"


def init_db(db_path: Path = DB_PATH) -> None:
    """Initialize tables and seed initial operational data."""
    os.makedirs(db_path.parent, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    # 1. Customers Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS customers (
            customer_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT,
            membership_tier TEXT DEFAULT 'Standard',
            created_at TEXT NOT NULL
        )
    """)

    # 2. Orders Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS orders (
            order_id TEXT PRIMARY KEY,
            customer_id TEXT NOT NULL,
            order_date TEXT NOT NULL,
            total_amount REAL NOT NULL,
            currency TEXT NOT NULL DEFAULT 'INR',
            status TEXT NOT NULL,
            items_summary TEXT NOT NULL,
            FOREIGN KEY (customer_id) REFERENCES customers (customer_id)
        )
    """)

    # 3. Tickets Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tickets (
            ticket_id TEXT PRIMARY KEY,
            customer_id TEXT NOT NULL,
            subject TEXT NOT NULL,
            description TEXT NOT NULL,
            priority TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'open',
            created_at TEXT NOT NULL,
            FOREIGN KEY (customer_id) REFERENCES customers (customer_id)
        )
    """)

    # Seed Customers
    initial_customers = [
        ("CUST-1001", "Alice Smith", "alice.smith@example.com", "+91-9876543210", "Gold", "2024-01-15 10:00:00"),
        ("CUST-1002", "Bob Jones", "bob.jones@example.com", "+91-9123456789", "Silver", "2024-02-10 14:30:00"),
        ("CUST-1003", "Charlie Brown", "charlie.b@example.com", "+91-9988776655", "Platinum", "2024-03-01 09:15:00")
    ]
    cursor.executemany("""
        INSERT OR IGNORE INTO customers (customer_id, name, email, phone, membership_tier, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, initial_customers)

    # Seed Orders
    # Note: CUST-1001 has 2 orders totaling 2450.0 INR (1250.0 + 1200.0), matching the prompt example!
    initial_orders = [
        ("ORD-5001", "CUST-1001", "2024-05-10 11:20:00", 1250.0, "INR", "delivered", "Ergonomic Mechanical Keyboard"),
        ("ORD-5002", "CUST-1001", "2024-05-18 16:45:00", 1200.0, "INR", "in_transit", "Wireless Noise-Cancelling Headphones"),
        ("ORD-5003", "CUST-1002", "2024-05-12 09:10:00", 850.0, "INR", "delivered", "USB-C Multiport Hub"),
        ("ORD-5004", "CUST-1003", "2024-05-20 13:00:00", 4999.0, "INR", "processing", "4K Ultra-Wide Monitor"),
        ("ORD-5005", "CUST-1003", "2024-05-22 17:30:00", 1500.0, "INR", "in_transit", "Adjustable Standing Desk Riser")
    ]
    cursor.executemany("""
        INSERT OR IGNORE INTO orders (order_id, customer_id, order_date, total_amount, currency, status, items_summary)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, initial_orders)

    # Seed Initial Tickets
    initial_tickets = [
        ("TCK-9001", "CUST-1002", "Delay in tracking update", "Order ORD-5003 tracking hasn't updated in 24 hours.", "low", "resolved", "2024-05-13 10:00:00")
    ]
    cursor.executemany("""
        INSERT OR IGNORE INTO tickets (ticket_id, customer_id, subject, description, priority, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, initial_tickets)

    conn.commit()
    conn.close()


def reset_db(db_path: Path = DB_PATH) -> None:
    """Clear and re-initialize the database to initial clean state."""
    if db_path.exists():
        os.remove(db_path)
    init_db(db_path)


if __name__ == "__main__":
    init_db()
    print(f"Database initialized successfully at {DB_PATH}")
