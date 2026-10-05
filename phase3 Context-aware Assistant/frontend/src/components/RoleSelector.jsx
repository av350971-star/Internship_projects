import React from 'react';

/**
 * RoleSelector Component
 * Allows switching between 'Customer' and 'Support Agent' roles.
 */
export default function RoleSelector({ role, onRoleChange, disabled }) {
  return (
    <div className="role-selector-container">
      <label htmlFor="roleSelect" className="role-label">
        Role:
      </label>
      <select
        id="roleSelect"
        value={role}
        onChange={(e) => onRoleChange(e.target.value)}
        disabled={disabled}
        className="role-dropdown"
      >
        <option value="customer">Customer</option>
        <option value="support_agent">Support Agent</option>
      </select>
    </div>
  );
}
