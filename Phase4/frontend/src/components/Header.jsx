import React from 'react';

export default function Header({
  role,
  setRole,
  customerId,
  setCustomerId,
  onReset,
  isResetting,
  isInspectorOpen,
  setIsInspectorOpen,
  executionCount
}) {
  const quickCustomers = ['CUST-1001', 'CUST-1002', 'CUST-1003'];

  // Role visual labels and privileges explanation
  const roleDetails = {
    customer: {
      badgeClass: 'role-customer',
      icon: '👤',
      label: 'Customer',
      summary: 'Restricted to own account (CUST-1001). Cannot send emails.'
    },
    support_agent: {
      badgeClass: 'role-support_agent',
      icon: '🎧',
      label: 'Support Agent',
      summary: 'Can look up any customer and draft tickets/emails.'
    },
    admin: {
      badgeClass: 'role-admin',
      icon: '👑',
      label: 'Administrator',
      summary: 'Full unrestricted system access to all tools & records.'
    }
  };

  const activeRole = roleDetails[role] || roleDetails.customer;

  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-icon">⚡</div>
        <div className="brand-info">
          <h1>
            Operations Assistant
            <span className="badge badge-success" style={{ fontSize: '10px' }}>SECURE GATEWAY</span>
          </h1>
          {/* Quick Concept Glossary for Non-Technical Mentors */}
          <div className="concept-glossary">
            <span
              className="glossary-pill"
              title="Pydantic Validation: Automatically checks that all tool inputs match required types and rules before running."
            >
              🔒 Pydantic Validation ⓘ
            </span>
            <span
              className="glossary-pill"
              title="RBAC (Role-Based Access Control): Enforces that users can only run tools and see records permitted for their role."
            >
              🛡️ RBAC Authorization ⓘ
            </span>
            <span
              className="glossary-pill"
              title="Side Effect: Operations that modify data (create tickets, send emails); strictly requires human approval."
            >
              ⚠️ Side-Effect Protection ⓘ
            </span>
          </div>
        </div>
      </div>

      <div className="header-controls">
        {/* Role Selector with Active Indicator */}
        <div className="control-group">
          <span className="control-label">Active Role</span>
          <select
            id="role-selector"
            className="role-select"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="customer">Customer (Limited)</option>
            <option value="support_agent">Support Agent</option>
            <option value="admin">Administrator (Full)</option>
          </select>
          {/* High-visibility active role badge */}
          <div
            className={`active-role-indicator ${activeRole.badgeClass}`}
            title={activeRole.summary}
          >
            <span>{activeRole.icon}</span>
            <span>{activeRole.label}</span>
          </div>
        </div>

        {/* Customer Identity Context */}
        <div className="control-group">
          <span className="control-label">User ID</span>
          <input
            id="user-id-input"
            className="user-id-input"
            type="text"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            placeholder="CUST-1001"
            title="Current customer identity context"
          />
          <div className="quick-id-pills">
            {quickCustomers.map((id) => (
              <button
                key={id}
                type="button"
                className={`id-pill ${customerId === id ? 'active' : ''}`}
                onClick={() => setCustomerId(id)}
                title={`Switch active ID to ${id}`}
              >
                {id.replace('CUST-', '#')}
              </button>
            ))}
          </div>
        </div>

        {/* Toggle Technical Inspector (Logs / Tools / DB) */}
        <button
          type="button"
          id="btn-toggle-inspector"
          className={`btn-inspector-toggle ${isInspectorOpen ? 'active' : ''}`}
          onClick={() => setIsInspectorOpen(!isInspectorOpen)}
          title="Toggle Technical Audit Log, Tools Registry, and SQLite DB Inspector"
        >
          <span>{isInspectorOpen ? '✕' : '🔍'}</span>
          <span>{isInspectorOpen ? 'Hide Inspector' : 'Technical Inspector'}</span>
          <span className="tab-badge" style={{ background: isInspectorOpen ? '#1e1b4b' : '#4f46e5' }}>
            {executionCount}
          </span>
        </button>

        {/* Reset State Button */}
        <button
          id="btn-reset-state"
          type="button"
          className="btn-reset"
          onClick={onReset}
          disabled={isResetting}
          title="Reset database, audit logs, and conversation history"
        >
          <span>↺</span>
          {isResetting ? 'Resetting...' : 'Reset State'}
        </button>
      </div>
    </header>
  );
}
