import React, { useState } from 'react';

export default function RawInspectorModal({
  isOpen,
  onClose,
  rawRequest,
  rawResponse
}) {
  const [activeTab, setActiveTab] = useState('request');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentData = activeTab === 'request' ? (rawRequest || { note: 'No request sent yet.' }) : (rawResponse || { note: 'No response received yet.' });
  const jsonString = JSON.stringify(currentData, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Raw LLM Payload Inspector 🔬</h3>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
            Exposes the exact, unabstracted JSON sent to the <code>/chat/completions</code> endpoint and the raw response payload returned.
          </p>

          <div className="inspector-tabs">
            <button
              className={`tab-btn ${activeTab === 'request' ? 'active' : ''}`}
              onClick={() => setActiveTab('request')}
            >
              HTTP Request Payload
            </button>
            <button
              className={`tab-btn ${activeTab === 'response' ? 'active' : ''}`}
              onClick={() => setActiveTab('response')}
            >
              HTTP Response Body
            </button>
          </div>

          <div style={{ position: 'relative' }}>
            <pre className="json-pre-box">
              <code>{jsonString}</code>
            </pre>
          </div>
        </div>

        <div className="modal-footer">
          <button className="pill-btn" onClick={handleCopy}>
            {copied ? '✓ Copied' : 'Copy JSON'}
          </button>
          <button className="pill-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
