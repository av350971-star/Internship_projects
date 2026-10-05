import React, { useState } from 'react';

export default function ApprovalModal({
  approval,
  onApprove,
  onReject,
  isProcessing
}) {
  const [reason, setReason] = useState('');

  if (!approval) return null;

  const isTicket = approval.tool === 'create_ticket';
  const isEmail = approval.tool === 'send_mock_email';
  const args = approval.arguments || {};

  return (
    <div className="approval-card" id={`approval-card-${approval.approval_id}`}>
      <div className="approval-title">
        <span>⚠️</span>
        <span>Side-Effect Approval Required — {approval.approval_id}</span>
      </div>

      <div style={{ fontSize: '11px', color: '#fcd34d', marginBottom: '8px' }}>
        ℹ️ <strong>Side Effect:</strong> An action that modifies database records or dispatches messages; strictly requires human confirmation.
      </div>

      <p className="approval-desc">
        {isTicket && 'This operation creates a support ticket in the operations SQLite database.'}
        {isEmail && 'This operation dispatches a simulated email to mock_emails.json.'}
        {!isTicket && !isEmail && `The tool '${approval.tool}' modifies system state and requires confirmation.`}
      </p>

      <div className="approval-args">
        <div style={{ color: '#94a3b8', marginBottom: '6px', fontSize: '11px' }}>
          <strong>Requested Parameters:</strong>
        </div>
        {Object.entries(args).map(([key, val]) => (
          <div key={key} style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
            <span style={{ color: '#818cf8', width: '110px' }}>{key}:</span>
            <span style={{ color: '#f1f5f9', flex: 1, wordBreak: 'break-word' }}>
              {typeof val === 'object' ? JSON.stringify(val) : String(val)}
            </span>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '12px' }}>
        <input
          type="text"
          className="chat-input"
          style={{ width: '100%', padding: '8px 12px', fontSize: '12px' }}
          placeholder="Optional approval/rejection note..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      <div className="approval-actions">
        <button
          type="button"
          id={`btn-approve-${approval.approval_id}`}
          className="btn-approve"
          disabled={isProcessing}
          onClick={() => onApprove(approval.approval_id, reason)}
        >
          {isProcessing ? 'Executing...' : '✓ Approve & Execute'}
        </button>

        <button
          type="button"
          id={`btn-reject-${approval.approval_id}`}
          className="btn-reject"
          disabled={isProcessing}
          onClick={() => onReject(approval.approval_id, reason)}
        >
          ✕ Reject Action
        </button>
      </div>
    </div>
  );
}
