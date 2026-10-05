"""
Tests for Execution Logging and Audit System.
"""
from services.tool_executor import execute_tool
from services.execution_logger import execution_logger


class TestExecutionLogs:
    def setup_method(self):
        execution_logger.reset()

    def test_successful_tool_records_complete_log(self):
        result = execute_tool(
            tool_name="calculator",
            raw_arguments={"expression": "10 * 5"},
            user_context={"role": "customer", "user_id": "CUST-1001"}
        )

        assert result["success"] is True
        exec_id = result["execution_id"]
        log = execution_logger.get_log(exec_id)

        assert log is not None
        assert log.tool == "calculator"
        assert log.validation_status == "PASSED"
        assert log.validated_arguments == {"expression": "10 * 5"}
        assert log.authorization == {"allowed": True, "reason": None}
        assert log.approval["required"] is False
        assert log.result == {"expression": "10 * 5", "result": 50, "status": "success"}
        assert log.error is None
        assert isinstance(log.elapsed_ms, float)
        assert log.elapsed_ms >= 0

    def test_failed_authorization_records_in_log(self):
        result = execute_tool(
            tool_name="send_mock_email",
            raw_arguments={"to": "test@example.com", "subject": "Test", "body": "Body"},
            user_context={"role": "customer", "user_id": "CUST-1001"}
        )

        assert result["success"] is False
        log = execution_logger.get_log(result["execution_id"])

        assert log is not None
        assert log.tool == "send_mock_email"
        assert log.authorization["allowed"] is False
        assert log.error["type"] == "AUTHORIZATION_ERROR"
        assert isinstance(log.elapsed_ms, float)

    def test_failed_validation_records_in_log(self):
        result = execute_tool(
            tool_name="lookup_customer",
            raw_arguments={"customer_id": "invalid-id-format"},
            user_context={"role": "admin", "user_id": "CUST-1001"}
        )

        assert result["success"] is False
        log = execution_logger.get_log(result["execution_id"])

        assert log is not None
        assert log.validation_status == "FAILED"
        assert log.error["type"] == "VALIDATION_ERROR"

    def test_secrets_redacted_from_logs(self):
        # Even if raw arguments contain sensitive key names
        result = execute_tool(
            tool_name="calculator",
            raw_arguments={"expression": "2 + 2", "api_key": "super_secret_123"},
            user_context={"role": "admin", "user_id": "CUST-1001"}
        )

        log = execution_logger.get_log(result["execution_id"])
        assert log is not None
        # Raw arguments in log must have redacted api_key
        assert log.raw_arguments.get("api_key") == "[REDACTED]"
