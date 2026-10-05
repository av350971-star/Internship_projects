import React, { useState } from 'react';

export default function ExecutionLog({ logs, onRefresh }) {
  const [filterTool, setFilterTool] = useState('all');
  const [expandedIds, setExpandedIds] = useState({});

  const toggleExpand = (id) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredLogs = logs.filter((log) => {
    if (filterTool === 'all') return true;
    return log.tool === filterTool;
  });

  return (
    <div className="tab-content" id="execution-logs-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Filter Tool:</span>
          <select
            className="role-select"
            style={{ fontSize: '11px', background: 'var(--bg-surface-elevated)', borderRadius: '4px', padding: '3px 8px' }}
            value={filterTool}
            onChange={(e) => setFilterTool(e.target.value)}
          >
            <option value="all">All Tools ({logs.length})</option>
            <option value="search_knowledge">search_knowledge</option>
            <option value="calculator">calculator</option>
            <option value="lookup_customer">lookup_customer</option>
            <option value="create_ticket">create_ticket</option>
            <option value="send_mock_email">send_mock_email</option>
          </select>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '12px' }}
        >
          ↺ Refresh Logs
        </button>
      </div>

      {filteredLogs.length === 0 ? (
        <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-subtle)', fontSize: '13px' }}>
          No execution records yet. Send a prompt in chat to observe the tool-calling pipeline!
        </div>
      ) : (
        filteredLogs.map((log) => {
          const isExpanded = !!expandedIds[log.execution_id];
          const isSuccess = !log.error && (log.result !== null || log.approval?.status === 'pending');
          const isAuthAllowed = log.authorization?.allowed;
          const isValPassed = log.validation_status === 'PASSED';
          const approvalStatus = log.approval?.status || 'not_required';

          return (
            <div key={log.execution_id} className="log-card" id={`log-card-${log.execution_id}`}>
              <div className="log-header">
                <div className="log-tool">
                  <span>🔧</span>
                  <span>{log.tool}</span>
                </div>
                <span className="log-elapsed">⏱ {log.elapsed_ms} ms</span>
              </div>

              <div className="log-badges">
                {/* Overall Status */}
                <span
                  className={`badge ${isSuccess ? 'badge-success' : 'badge-error'}`}
                  title="Overall pipeline execution status"
                >
                  {isSuccess ? 'SUCCESS' : 'FAILED'}
                </span>

                {/* Role */}
                <span className="badge badge-neutral" title="User role under RBAC at the time of execution">
                  ROLE: {log.role}
                </span>

                {/* Validation Badge */}
                <span
                  className={`badge ${isValPassed ? 'badge-success' : log.validation_status === 'FAILED' ? 'badge-error' : 'badge-neutral'}`}
                  title="Pydantic Validation: Checks arguments against strict types & rules before running"
                >
                  VAL: {log.validation_status}
                </span>

                {/* Authorization Badge */}
                <span
                  className={`badge ${isAuthAllowed ? 'badge-success' : 'badge-error'}`}
                  title="RBAC Authorization: Checks if this role is permitted to run this tool"
                >
                  AUTH: {isAuthAllowed ? 'ALLOWED' : 'DENIED'}
                </span>

                {/* Approval Badge */}
                <span
                  className={`badge ${
                    approvalStatus === 'approved' ? 'badge-success' :
                    approvalStatus === 'pending' ? 'badge-warning' :
                    approvalStatus === 'rejected' ? 'badge-error' : 'badge-neutral'
                  }`}
                  title="Approval Gate: Side-effect protection requiring human confirmation"
                >
                  APPR: {approvalStatus.toUpperCase()}
                </span>
              </div>

              <div style={{ fontSize: '11px', color: 'var(--text-subtle)', display: 'flex', justifyContent: 'space-between' }}>
                <span>ID: {log.execution_id}</span>
                <span>User: {log.user_id}</span>
              </div>

              {/* Arguments Summary */}
              <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                <strong>Args:</strong>{' '}
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#e2e8f0' }}>
                  {JSON.stringify(log.validated_arguments || log.raw_arguments)}
                </span>
              </div>

              {/* Error Snippet if failed */}
              {log.error && (
                <div style={{ marginTop: '6px', fontSize: '12px', color: '#fb7185' }}>
                  <strong>Error ({log.error.type}):</strong> {log.error.message}
                </div>
              )}

              {/* Expand Toggle */}
              <button
                type="button"
                className="log-details-toggle"
                onClick={() => toggleExpand(log.execution_id)}
              >
                <span>{isExpanded ? '▼ Hide Full Audit Payload' : '▶ View Full Audit Payload'}</span>
              </button>

              {/* Collapsible Full JSON */}
              {isExpanded && (
                <pre className="log-details">
                  {JSON.stringify(log, null, 2)}
                </pre>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
