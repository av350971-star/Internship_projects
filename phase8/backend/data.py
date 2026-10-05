"""
Seed data for the Business Operations MCP Server.

Small in-memory "database" so the whole project runs with zero setup.
In real life this would be Postgres / MySQL — the tool functions below
are the only place that would change.
"""

CUSTOMERS = [
    {"id": "CUST-001", "name": "Aarav Sharma",  "email": "aarav.sharma@gmail.com",   "phone": "+91 98290 11111", "tier": "gold",   "city": "Indore"},
    {"id": "CUST-002", "name": "Priya Patel",   "email": "priya.patel@outlook.com",  "phone": "+91 98290 22222", "tier": "silver", "city": "Bhopal"},
    {"id": "CUST-003", "name": "Rohan Mehta",   "email": "rohan.mehta@yahoo.in",     "phone": "+91 98290 33333", "tier": "gold",   "city": "Mumbai"},
    {"id": "CUST-004", "name": "Sneha Iyer",    "email": "sneha.iyer@gmail.com",     "phone": "+91 98290 44444", "tier": "basic",  "city": "Pune"},
    {"id": "CUST-005", "name": "Vikram Singh",  "email": "vikram.singh@gmail.com",   "phone": "+91 98290 55555", "tier": "silver", "city": "Jaipur"},
    {"id": "CUST-006", "name": "Ananya Rao",    "email": "ananya.rao@gmail.com",     "phone": "+91 98290 66666", "tier": "gold",   "city": "Bengaluru"},
    {"id": "CUST-007", "name": "Karan Kapoor",  "email": "karan.kapoor@gmail.com",   "phone": "+91 98290 77777", "tier": "basic",  "city": "Delhi"},
    {"id": "CUST-008", "name": "Ishita Verma",  "email": "ishita.verma@gmail.com",   "phone": "+91 98290 88888", "tier": "silver", "city": "Indore"},
]

ORDERS = [
    {"id": "ORD-1001", "customer_id": "CUST-001", "item": "Wireless Mouse",        "amount": 1299,  "status": "delivered", "date": "2026-09-02"},
    {"id": "ORD-1002", "customer_id": "CUST-001", "item": "USB-C Hub 7-in-1",      "amount": 3499,  "status": "shipped",   "date": "2026-09-20"},
    {"id": "ORD-1003", "customer_id": "CUST-002", "item": "Mechanical Keyboard",   "amount": 5499,  "status": "delivered", "date": "2026-08-28"},
    {"id": "ORD-1004", "customer_id": "CUST-002", "item": "Laptop Stand",          "amount": 1899,  "status": "delivered", "date": "2026-09-11"},
    {"id": "ORD-1005", "customer_id": "CUST-003", "item": "Noise-Cancel Headphones","amount": 8999, "status": "delivered", "date": "2026-07-15"},
    {"id": "ORD-1006", "customer_id": "CUST-003", "item": "Webcam 1080p",          "amount": 2799,  "status": "returned",  "date": "2026-08-05"},
    {"id": "ORD-1007", "customer_id": "CUST-004", "item": "Monitor 24 inch",       "amount": 11999, "status": "delivered", "date": "2026-09-01"},
    {"id": "ORD-1008", "customer_id": "CUST-004", "item": "HDMI Cable 2m",         "amount": 499,   "status": "delivered", "date": "2026-09-01"},
    {"id": "ORD-1009", "customer_id": "CUST-005", "item": "SSD 1TB",               "amount": 6499,  "status": "shipped",   "date": "2026-09-25"},
    {"id": "ORD-1010", "customer_id": "CUST-005", "item": "Laptop Backpack",       "amount": 2299,  "status": "delivered", "date": "2026-08-19"},
    {"id": "ORD-1011", "customer_id": "CUST-006", "item": "Smart Watch",           "amount": 4999,  "status": "delivered", "date": "2026-09-08"},
    {"id": "ORD-1012", "customer_id": "CUST-006", "item": "Bluetooth Speaker",     "amount": 1999,  "status": "cancelled", "date": "2026-09-14"},
    {"id": "ORD-1013", "customer_id": "CUST-007", "item": "Tablet 10 inch",        "amount": 15999, "status": "delivered", "date": "2026-08-30"},
    {"id": "ORD-1014", "customer_id": "CUST-008", "item": "Phone Charger 65W",     "amount": 1499,  "status": "delivered", "date": "2026-09-18"},
    {"id": "ORD-1015", "customer_id": "CUST-008", "item": "Desk Lamp",             "amount": 999,   "status": "shipped",   "date": "2026-09-27"},
]

# Support tickets created at runtime get appended here.
TICKETS = [
    {"id": "TKT-9001", "customer_id": "CUST-003", "subject": "Headphones battery drains fast", "description": "Battery lasts only 1 hour after 3 months of use.", "priority": "high",   "status": "open",     "created_at": "2026-09-26"},
    {"id": "TKT-9002", "customer_id": "CUST-005", "subject": "Wrong colour backpack delivered", "description": "Ordered black, received grey.",               "priority": "medium", "status": "in_progress", "created_at": "2026-09-27"},
]

# Refunds processed at runtime get appended here (the audited side effect).
REFUNDS = []
