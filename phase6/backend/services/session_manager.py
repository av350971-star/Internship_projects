import sqlite3
import json
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from pathlib import Path

from models.session_models import SessionState, ChatMessage
from config import SESSION_DB_PATH


class SessionManager:
    def __init__(self, db_path: Path = SESSION_DB_PATH):
        self.db_path = db_path
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sessions (
                    session_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    messages_json TEXT NOT NULL,
                    current_task TEXT,
                    temporary_state_json TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)")
            conn.commit()

    def get_or_create_session(self, session_id: Optional[str], user_id: str) -> SessionState:
        now_iso = datetime.now(timezone.utc).isoformat()
        if session_id:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT * FROM sessions WHERE session_id = ? AND user_id = ?",
                    (session_id, user_id)
                )
                row = cursor.fetchone()
                if row:
                    messages = [ChatMessage(**m) for m in json.loads(row["messages_json"])]
                    temp_state = json.loads(row["temporary_state_json"])
                    return SessionState(
                        session_id=row["session_id"],
                        user_id=row["user_id"],
                        messages=messages,
                        current_task=row["current_task"],
                        temporary_state=temp_state,
                        created_at=row["created_at"],
                        updated_at=row["updated_at"]
                    )

        # Create new session
        new_session_id = session_id or f"SESSION-{uuid.uuid4().hex[:8].upper()}"
        initial_messages: List[dict] = []
        initial_temp: Dict[str, Any] = {}

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO sessions (
                    session_id, user_id, messages_json, current_task,
                    temporary_state_json, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                new_session_id,
                user_id,
                json.dumps(initial_messages),
                None,
                json.dumps(initial_temp),
                now_iso,
                now_iso
            ))
            conn.commit()

        return SessionState(
            session_id=new_session_id,
            user_id=user_id,
            messages=[],
            current_task=None,
            temporary_state=initial_temp,
            created_at=now_iso,
            updated_at=now_iso
        )

    def get_session(self, session_id: str, user_id: str) -> Optional[SessionState]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM sessions WHERE session_id = ? AND user_id = ?",
                (session_id, user_id)
            )
            row = cursor.fetchone()
            if not row:
                return None
            messages = [ChatMessage(**m) for m in json.loads(row["messages_json"])]
            return SessionState(
                session_id=row["session_id"],
                user_id=row["user_id"],
                messages=messages,
                current_task=row["current_task"],
                temporary_state=json.loads(row["temporary_state_json"]),
                created_at=row["created_at"],
                updated_at=row["updated_at"]
            )

    def add_message(
        self,
        session_id: str,
        user_id: str,
        role: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> SessionState:
        session = self.get_or_create_session(session_id, user_id)
        msg_id = f"MSG-{uuid.uuid4().hex[:8].upper()}"
        now_iso = datetime.now(timezone.utc).isoformat()
        new_msg = ChatMessage(
            id=msg_id,
            role=role,
            content=content,
            timestamp=now_iso,
            metadata=metadata
        )
        session.messages.append(new_msg)
        session.updated_at = now_iso

        # Infer basic task if task not set
        if not session.current_task and role == "user":
            session.current_task = self._infer_task(content)

        messages_json = json.dumps([m.model_dump() for m in session.messages])
        temp_state_json = json.dumps(session.temporary_state)

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE sessions
                SET messages_json = ?, current_task = ?, temporary_state_json = ?, updated_at = ?
                WHERE session_id = ? AND user_id = ?
            """, (
                messages_json,
                session.current_task,
                temp_state_json,
                session.updated_at,
                session_id,
                user_id
            ))
            conn.commit()

        return session

    def reset_session(self, session_id: str, user_id: str) -> SessionState:
        """
        Clears message history and temporary state for the current session.
        CRITICAL: Does NOT touch data/memory.db (long-term memory).
        """
        now_iso = datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE sessions
                SET messages_json = '[]',
                    current_task = NULL,
                    temporary_state_json = '{}',
                    updated_at = ?
                WHERE session_id = ? AND user_id = ?
            """, (now_iso, session_id, user_id))
            conn.commit()

        return SessionState(
            session_id=session_id,
            user_id=user_id,
            messages=[],
            current_task=None,
            temporary_state={},
            created_at=now_iso,
            updated_at=now_iso
        )

    def _infer_task(self, text: str) -> Optional[str]:
        lower = text.lower()
        if "python" in lower or "code" in lower or "api" in lower or "function" in lower:
            return "code_assistance"
        if "email" in lower or "draft" in lower:
            return "email_writing"
        if "explain" in lower or "teach" in lower:
            return "explanation"
        if "debug" in lower or "error" in lower or "fix" in lower:
            return "troubleshooting"
        return "general_conversation"
