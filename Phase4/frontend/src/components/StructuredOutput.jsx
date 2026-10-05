import React from 'react';

export default function StructuredOutput({ data }) {
  if (!data) return null;

  return (
    <div className="structured-output-card" id="structured-output-card">
      <div className="output-header">
        <div className="output-title">
          <span>📊</span>
          <span>Structured Output: {data.workflow || 'Order Support Summary'}</span>
        </div>
        <span className={`badge ${data.status === 'completed' ? 'badge-success' : 'badge-error'}`}>
          {data.status || 'COMPLETED'}
        </span>
      </div>

      <div className="output-grid">
        <div className="stat-box">
          <div className="stat-label">Customer ID</div>
          <div className="stat-value" style={{ fontSize: '15px' }}>{data.customer_id}</div>
        </div>

        <div className="stat-box">
          <div className="stat-label">Orders Found</div>
          <div className="stat-value">{data.orders_found}</div>
        </div>

        <div className="stat-box">
          <div className="stat-label">Total Calculated</div>
          <div className="stat-value" style={{ color: '#10b981' }}>
            {data.total_amount?.toLocaleString()} {data.currency || 'INR'}
          </div>
        </div>
      </div>

      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
        Tools Executed in Pipeline:
      </div>
      <div className="tools-used-list">
        {data.tools_used?.map((toolName, idx) => (
          <span key={idx} className="tool-tag">
            🔧 {toolName}
          </span>
        ))}
      </div>
    </div>
  );
}
