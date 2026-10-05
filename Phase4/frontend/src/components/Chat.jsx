import React, { useState, useRef, useEffect } from 'react';
import StructuredOutput from './StructuredOutput';
import ApprovalModal from './ApprovalModal';

export default function Chat({
  messages,
  onSendMessage,
  isLoading,
  onApprove,
  onReject,
  isProcessingApproval,
  role,
  customerId
}) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const samplePrompts = [
    { label: '📖 Refund Policy', text: 'What is our refund policy?' },
    { label: '🧮 Calculator (250*4+100)', text: 'What is 250 * 4 + 100?' },
    { label: '👤 Lookup My Profile', text: `Look up customer ${customerId} with orders.` },
    { label: '🚫 RBAC Test (Lookup Other)', text: 'Look up customer CUST-1002.' },
    { label: '🎫 Create Ticket (Approval)', text: 'Create a ticket because my order has not arrived and is delayed.' },
    { label: '✉️ Send Mock Email', text: 'Send an email to logistics@example.com about delivery status.' },
    { label: '📊 Orders Total Summary', text: `Check customer ${customerId}'s orders and calculate the total order amount.` }
  ];

  return (
    <div className="chat-section">
      <div className="chat-messages" id="chat-messages-container">
        {messages.map((msg, index) => (
          <div key={index} className={`message-row ${msg.role}`}>
            <div className="message-meta">
              {msg.role === 'user' ? (
                <>
                  <span className="badge badge-neutral">{msg.senderRole || role}</span>
                  <span>{msg.customerId || customerId}</span>
                </>
              ) : (
                <>
                  <span className="badge badge-success">ASSISTANT</span>
                  <span>System Gateway</span>
                </>
              )}
            </div>

            <div className="message-bubble">
              <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>

              {/* Inline Tool Execution Chips */}
              {msg.tool_calls && msg.tool_calls.length > 0 && (
                <div className="tool-invocations">
                  {msg.tool_calls.map((tc, idx) => (
                    <div key={idx} className="tool-chip">
                      <span>🔧</span>
                      <span>{tc.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Inline Structured Output */}
              {msg.structured_output && (
                <StructuredOutput data={msg.structured_output} />
              )}

              {/* Inline Approval Prompt */}
              {msg.pending_approval && msg.pending_approval.status === 'pending' && (
                <ApprovalModal
                  approval={msg.pending_approval}
                  onApprove={onApprove}
                  onReject={onReject}
                  isProcessing={isProcessingApproval}
                />
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message-row assistant">
            <div className="message-meta">
              <span className="badge badge-warning">PROCESSING</span>
              <span>Evaluating pipeline...</span>
            </div>
            <div className="message-bubble" style={{ color: 'var(--text-muted)' }}>
              ⚡ Routing request through validation and authorization layers...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompt Suggestions */}
      <div className="prompt-suggestions">
        {samplePrompts.map((p, idx) => (
          <button
            key={idx}
            type="button"
            className="suggestion-chip"
            onClick={() => onSendMessage(p.text)}
            disabled={isLoading}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Chat Input Bar */}
      <form className="chat-input-bar" onSubmit={handleSubmit}>
        <input
          id="chat-input-field"
          type="text"
          className="chat-input"
          placeholder="Ask operations assistant, calculate, look up orders, create tickets..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
        />
        <button
          id="btn-send-chat"
          type="submit"
          className="btn-send"
          disabled={isLoading || !input.trim()}
        >
          <span>Send</span>
          <span>→</span>
        </button>
      </form>
    </div>
  );
}
