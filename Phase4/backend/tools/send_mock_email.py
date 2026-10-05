"""
Tool 5: send_mock_email
Simulates sending an email by appending the message to data/mock_emails.json.
This is a SIDE-EFFECT tool requiring explicit human approval.
"""
import datetime
import json
import random
from pathlib import Path
from typing import Any, Dict, List

EMAILS_FILE = Path(__file__).resolve().parent.parent / "data" / "mock_emails.json"


def send_mock_email(to: str, subject: str, body: str) -> Dict[str, Any]:
    """
    Appends simulated email to mock_emails.json.
    Never transmits real external network traffic or emails.
    """
    email_id = f"EMAIL-{random.randint(10000, 99999)}"
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    mock_email_record = {
        "email_id": email_id,
        "mode": "MOCK EMAIL - SIMULATION ONLY",
        "to": to,
        "subject": subject,
        "body": body,
        "sent_at": now_iso,
        "status": "delivered_to_mock_inbox"
    }

    emails: List[Dict[str, Any]] = []
    if EMAILS_FILE.exists():
        try:
            with open(EMAILS_FILE, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if content:
                    emails = json.loads(content)
        except Exception:
            emails = []

    emails.append(mock_email_record)

    with open(EMAILS_FILE, "w", encoding="utf-8") as f:
        json.dump(emails, f, indent=2)

    return {
        "success": True,
        "email_id": email_id,
        "mode": "MOCK EMAIL",
        "to": to,
        "subject": subject,
        "sent_at": now_iso,
        "message": f"MOCK EMAIL successfully dispatched to simulation store (ID: {email_id})."
    }
