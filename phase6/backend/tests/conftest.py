import pytest
from pathlib import Path
import tempfile
from services.session_manager import SessionManager
from services.memory_manager import MemoryManager
from services.audit_service import AuditService
from services.memory_retriever import MemoryRetriever
from services.context_builder import ContextBuilder
from services.memory_extractor import MemoryExtractor


@pytest.fixture
def temp_dir():
    with tempfile.TemporaryDirectory() as td:
        yield Path(td)


@pytest.fixture
def audit_service(temp_dir):
    return AuditService(db_path=temp_dir / "test_memory.db")


@pytest.fixture
def memory_manager(temp_dir, audit_service):
    return MemoryManager(db_path=temp_dir / "test_memory.db", audit_service=audit_service)


@pytest.fixture
def session_manager(temp_dir):
    return SessionManager(db_path=temp_dir / "test_sessions.db")


@pytest.fixture
def memory_retriever(memory_manager, audit_service):
    return MemoryRetriever(
        memory_manager=memory_manager,
        audit_service=audit_service,
        relevance_threshold=0.60,
        confidence_threshold=0.70
    )


@pytest.fixture
def context_builder(audit_service):
    return ContextBuilder(
        audit_service=audit_service,
        max_memories=5,
        context_budget=1200
    )


@pytest.fixture
def memory_extractor(memory_manager):
    return MemoryExtractor(memory_manager=memory_manager)
