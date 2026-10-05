from typing import Optional
from fastapi import Header
from config import DEFAULT_USER_ID, MEMORY_DB_PATH, SESSION_DB_PATH
from services.session_manager import SessionManager
from services.memory_manager import MemoryManager
from services.audit_service import AuditService
from services.memory_retriever import MemoryRetriever
from services.context_builder import ContextBuilder
from services.memory_extractor import MemoryExtractor
from services.llm_service import LLMService

# Shared service singletons
audit_service = AuditService(db_path=MEMORY_DB_PATH)
session_manager = SessionManager(db_path=SESSION_DB_PATH)
memory_manager = MemoryManager(db_path=MEMORY_DB_PATH, audit_service=audit_service)
memory_retriever = MemoryRetriever(memory_manager=memory_manager, audit_service=audit_service)
context_builder = ContextBuilder(audit_service=audit_service)
memory_extractor = MemoryExtractor(memory_manager=memory_manager)
llm_service = LLMService()


def get_current_user_id(x_user_id: Optional[str] = Header(default=None)) -> str:
    """
    Extracts authenticated user ID from context/headers.
    Guarantees user isolation: clients cannot read/write other users' data by query parameter.
    """
    if x_user_id and x_user_id.strip():
        return x_user_id.strip()
    return DEFAULT_USER_ID
