import json
import sqlite3
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime
from backend.config import settings

class SQLiteStore:
    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = db_path or settings.SQLITE_DB_PATH
        self.init_db()

    def get_connection(self) -> sqlite3.Connection:
        """Returns a configured SQLite connection with row factory and foreign keys."""
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.execute("PRAGMA journal_mode = WAL;")
        return conn

    def init_db(self):
        """Initializes tables for documents and chunks with indexing."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            # Documents table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                file_type TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                tenant_id TEXT NOT NULL,
                project_id TEXT DEFAULT 'default',
                checksum TEXT NOT NULL,
                chunk_count INTEGER DEFAULT 0,
                uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            """)

            # Chunks table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS chunks (
                id TEXT PRIMARY KEY,
                doc_id TEXT NOT NULL,
                tenant_id TEXT NOT NULL,
                chunk_index INTEGER NOT NULL,
                page_number INTEGER DEFAULT 1,
                section_title TEXT DEFAULT '',
                text_content TEXT NOT NULL,
                token_count INTEGER DEFAULT 0,
                embedding_json TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (doc_id) REFERENCES documents(id) ON DELETE CASCADE
            );
            """)

            # Performance indices
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_docs_tenant ON documents(tenant_id);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_docs_checksum ON documents(tenant_id, checksum);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_chunks_tenant ON chunks(tenant_id);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_chunks_doc ON chunks(doc_id);")
            conn.commit()

    def get_all_tenants(self) -> List[str]:
        """Returns all distinct tenants in the system."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT DISTINCT tenant_id FROM documents ORDER BY tenant_id ASC")
            tenants = [row["tenant_id"] for row in cursor.fetchall()]
            if not tenants:
                # Default seed tenants
                return ["tenant_engineering", "tenant_hr"]
            # Ensure default tenants are visible if needed
            for default_t in ["tenant_engineering", "tenant_hr"]:
                if default_t not in tenants:
                    tenants.append(default_t)
            return sorted(tenants)

    def save_document(self, doc: Dict[str, Any]) -> str:
        """Inserts or updates a document record."""
        now = datetime.utcnow().isoformat()
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO documents (
                id, filename, file_type, file_size, tenant_id, project_id, checksum, chunk_count, uploaded_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                file_size = excluded.file_size,
                checksum = excluded.checksum,
                chunk_count = excluded.chunk_count,
                updated_at = excluded.updated_at
            """, (
                doc["id"],
                doc["filename"],
                doc["file_type"],
                doc["file_size"],
                doc["tenant_id"],
                doc.get("project_id", "default"),
                doc["checksum"],
                doc.get("chunk_count", 0),
                now,
                now
            ))
            conn.commit()
            return doc["id"]

    def find_document_by_checksum(self, tenant_id: str, checksum: str) -> Optional[Dict[str, Any]]:
        """Finds if an identical file has already been ingested for this tenant."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM documents WHERE tenant_id = ? AND checksum = ? LIMIT 1",
                (tenant_id, checksum)
            )
            row = cursor.fetchone()
            return dict(row) if row else None

    def find_document_by_filename(self, tenant_id: str, filename: str) -> Optional[Dict[str, Any]]:
        """Finds existing document by filename and tenant."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM documents WHERE tenant_id = ? AND filename = ? LIMIT 1",
                (tenant_id, filename)
            )
            row = cursor.fetchone()
            return dict(row) if row else None

    def delete_document(self, doc_id: str) -> bool:
        """Deletes a document and cascades deletion of its chunks."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            # Explicit chunk delete in case foreign key cascade is disabled on some sqlite versions
            cursor.execute("DELETE FROM chunks WHERE doc_id = ?", (doc_id,))
            cursor.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
            conn.commit()
            return cursor.rowcount > 0

    def delete_chunks_for_document(self, doc_id: str):
        """Deletes chunks for a document during a re-index flow."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM chunks WHERE doc_id = ?", (doc_id,))
            conn.commit()

    def save_chunks(self, chunks: List[Dict[str, Any]]):
        """Batch inserts document chunks with embeddings."""
        if not chunks:
            return
        with self.get_connection() as conn:
            cursor = conn.cursor()
            now = datetime.utcnow().isoformat()
            data = []
            for c in chunks:
                emb_str = json.dumps(c["embedding"]) if "embedding" in c and c["embedding"] is not None else None
                data.append((
                    c["id"],
                    c["doc_id"],
                    c["tenant_id"],
                    c["chunk_index"],
                    c.get("page_number", 1),
                    c.get("section_title", ""),
                    c["text_content"],
                    c.get("token_count", len(c["text_content"].split())),
                    emb_str,
                    now
                ))
            cursor.executemany("""
            INSERT OR REPLACE INTO chunks (
                id, doc_id, tenant_id, chunk_index, page_number, section_title, text_content, token_count, embedding_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, data)
            conn.commit()

    def get_documents(self, tenant_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Retrieves documents, optionally filtered by tenant."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if tenant_id:
                cursor.execute(
                    "SELECT * FROM documents WHERE tenant_id = ? ORDER BY uploaded_at DESC",
                    (tenant_id,)
                )
            else:
                cursor.execute("SELECT * FROM documents ORDER BY uploaded_at DESC")
            return [dict(row) for row in cursor.fetchall()]

    def get_document_by_id(self, doc_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves document by ID."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM documents WHERE id = ? LIMIT 1", (doc_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def get_chunks_by_tenant(self, tenant_id: str) -> List[Dict[str, Any]]:
        """
        Retrieves all chunks belonging strictly to a tenant.
        Joins document filename for citation clarity.
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT 
                c.id, c.doc_id, c.tenant_id, c.chunk_index, c.page_number, 
                c.section_title, c.text_content, c.token_count, c.embedding_json,
                d.filename as doc_filename, d.file_type as doc_file_type
            FROM chunks c
            JOIN documents d ON c.doc_id = d.id
            WHERE c.tenant_id = ?
            ORDER BY c.doc_id, c.chunk_index ASC
            """, (tenant_id,))
            
            results = []
            for row in cursor.fetchall():
                row_dict = dict(row)
                if row_dict.get("embedding_json"):
                    row_dict["embedding"] = json.loads(row_dict["embedding_json"])
                else:
                    row_dict["embedding"] = None
                del row_dict["embedding_json"]
                results.append(row_dict)
            return results

    def get_chunk_by_id(self, chunk_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves single chunk with doc filename."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT 
                c.*, d.filename as doc_filename, d.file_type as doc_file_type
            FROM chunks c
            JOIN documents d ON c.doc_id = d.id
            WHERE c.id = ? LIMIT 1
            """, (chunk_id,))
            row = cursor.fetchone()
            if not row:
                return None
            res = dict(row)
            if res.get("embedding_json"):
                res["embedding"] = json.loads(res["embedding_json"])
            return res

# Global store singleton
store = SQLiteStore()
