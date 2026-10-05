import React, { useState } from 'react';

/**
 * DebugContext Component
 * Collapsible section displaying strictly context metadata and categories.
 * Never displays hidden model reasoning or private internal document contents.
 */
export default function DebugContext({ debug }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!debug) return null;

  const role = debug.role || 'customer';
  const isCustomer = role === 'customer';
  const roleDisplay = debug.role_display || (isCustomer ? 'Customer' : 'Support Agent');
  const promptVersion = debug.prompt_version || 'customer_v1.0';

  const summaryUsed = debug.summary_used ? 'Used' : 'Not Used';
  const tokensSaved = debug.tokens_saved || 0;
  const summaryDisplay = debug.summary_used && tokensSaved > 0
    ? `Used (Saved ${tokensSaved} tokens)`
    : summaryUsed;

  const relevantHistoryCount = debug.relevant_history_count ?? 0;
  const retrievedDocsCount = debug.retrieved_document_count ?? 0;
  const estimatedTokens = debug.estimated_tokens ?? 0;
  const contextBudget = debug.context_budget ?? 1200;

  const allowedCategories = debug.allowed_context_categories || [
    'Conversation',
    'Public Support Documents'
  ];

  const restrictedCategories = debug.restricted_context_categories || (
    isCustomer ? ['Internal Support Documents'] : []
  );

  return (
    <div className="debug-accordion">
      <button
        type="button"
        className="debug-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className="debug-arrow">{isOpen ? '▾' : '▸'}</span>
        <span>Context Debug</span>
      </button>

      {isOpen && (
        <div className="debug-content-box">
          <div className="debug-grid">
            <div className="debug-item">
              <span className="debug-item-label">Role</span>
              <span className="debug-item-value">{roleDisplay}</span>
            </div>

            <div className="debug-item">
              <span className="debug-item-label">Prompt Version</span>
              <span className="debug-item-value">{promptVersion}</span>
            </div>

            <div className="debug-item">
              <span className="debug-item-label">Summary</span>
              <span className="debug-item-value">{summaryDisplay}</span>
            </div>

            <div className="debug-item">
              <span className="debug-item-label">History</span>
              <span className="debug-item-value">{relevantHistoryCount} relevant messages</span>
            </div>

            <div className="debug-item">
              <span className="debug-item-label">Retrieved Support Documents</span>
              <span className="debug-item-value">{retrievedDocsCount}</span>
            </div>

            <div className="debug-item">
              <span className="debug-item-label">Context Budget</span>
              <span className="debug-item-value">
                {estimatedTokens} / {contextBudget} tokens
              </span>
            </div>
          </div>

          <div className="debug-allowed-section">
            <div className="debug-allowed-title">Allowed Context:</div>
            <ul className="debug-allowed-list">
              {allowedCategories.map((cat, idx) => (
                <li key={idx} className="allowed-item allowed-yes">
                  ✓ {cat}
                </li>
              ))}
            </ul>

            {restrictedCategories.length > 0 && (
              <div className="debug-restricted-group">
                <div className="debug-restricted-title">Restricted Context:</div>
                <ul className="debug-allowed-list">
                  {restrictedCategories.map((cat, idx) => (
                    <li key={idx} className="allowed-item allowed-no">
                      ✗ {cat} (Blocked for {roleDisplay})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
