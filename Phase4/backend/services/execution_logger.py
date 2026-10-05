"""
Execution Logger recording every tool invocation attempt, validation status,
authorization outcome, approval state, execution duration, and sanitized results/errors.
"""
import datetime
import random
from typing import Any, Dict, List, Optional
from models.execution_models import ExecutionLog

SENSITIVE_KEYS = {"api_key", "secret", "password", "token", "auth_token", "system_prompt"}


def _sanitize_dict(data: Any) -> Any:
    """Recursively redacts sensitive keys to prevent logging credentials or prompts."""
    if isinstance(data, dict):
        sanitized = {}
        for k, v in data.items():
            if any(s in k.lower() for s in SENSITIVE_KEYS):
                sanitized[k] = "[REDACTED]"
            else:
                sanitized[k] = _sanitize_dict(v)
        return sanitized
    if isinstance(data, list):
        return [_sanitize_dict(item) for item in data]
    return data


class ExecutionLogger:
    def __init__(self):
        self._logs: List[ExecutionLog] = []

    def record(
        self,
        user_id: str,
        role: str,
        tool: str,
        raw_arguments: Dict[str, Any],
        validated_arguments: Optional[Dict[str, Any]],
        validation_status: str,
        authorization: Dict[str, Any],
        approval: Dict[str, Any],
        result: Optional[Any],
        error: Optional[Dict[str, Any]],
        elapsed_ms: float
    ) -> ExecutionLog:
        """Create and store an audit execution log entry."""
        execution_id = f"EXEC-{random.randint(10000, 99999)}"
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

        entry = ExecutionLog(
            execution_id=execution_id,
            timestamp=now_iso,
            user_id=user_id,
            role=role,
            tool=tool,
            raw_arguments=_sanitize_dict(raw_arguments),
            validated_arguments=_sanitize_dict(validated_arguments) if validated_arguments else None,
            validation_status=validation_status,
            authorization=authorization,
            approval=approval,
            result=_sanitize_dict(result) if result is not None else None,
            error=error,
            elapsed_ms=round(elapsed_ms, 2)
        )
        self._logs.append(entry)
        return entry

    def list_logs(self, limit: int = 100) -> List[ExecutionLog]:
        """Return the most recent execution logs."""
        sorted_logs = sorted(self._logs, key=lambda x: x.timestamp, reverse=True)
        return sorted_logs[:limit]

    def get_log(self, execution_id: str) -> Optional[ExecutionLog]:
        """Fetch an individual execution log by ID."""
        for log in self._logs:
            if log.execution_id == execution_id:
                return log
        return None

    def reset(self) -> None:
        """Clear all stored logs."""
        self._logs.clear()


# Global singleton instance
execution_logger = ExecutionLogger()
