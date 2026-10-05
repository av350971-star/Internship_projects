import React from 'react';

/**
 * ExampleQuestions Component
 * Displays role-tailored example questions based on actual documents in the knowledge base.
 * Clicking a question populates the chat input for review before sending.
 */
export default function ExampleQuestions({ role, onSelectQuestion }) {
  // Verified questions mapped directly to backend support documents
  const customerQuestions = [
    "What is your return and refund policy?",
    "How long does standard shipping take?",
    "Can I cancel my order before dispatch?",
    "How do I report a damaged item?"
  ];

  const agentQuestions = [
    "What is the refund override authorization code?",
    "What is the Tier-2 supervisor escalation hotline?",
    "What is the fraud checklist for multiple return claims?",
    "How do I troubleshoot carrier tracking stuck on label created?"
  ];

  const isCustomer = role === 'customer';
  const activeQuestions = isCustomer ? customerQuestions : agentQuestions;

  return (
    <aside className="examples-panel" aria-label="Example Questions">
      <div className="examples-header">
        <span className="examples-title">Try an example</span>
        <span className="examples-role-tag">
          {isCustomer ? 'Customer' : 'Support Agent'}
        </span>
      </div>

      <p className="examples-subtext">
        Click a question to paste it into the input box:
      </p>

      <ul className="examples-list">
        {activeQuestions.map((q, idx) => (
          <li key={idx} className="example-item">
            <button
              type="button"
              className="example-btn"
              onClick={() => onSelectQuestion(q)}
              title="Click to copy into chat input"
            >
              • {q}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
