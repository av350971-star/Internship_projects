import React from 'react';
import RoleSelector from './RoleSelector';

/**
 * Header Component
 * Displays application title on the left, role selector and new chat button on the right.
 */
export default function Header({ role, onRoleChange, onNewChat, isLoading }) {
  const roleDisplayName = role === 'customer' ? 'Customer' : 'Support Agent';

  return (
    <header className="app-header">
      <div className="header-left">
        <h1 className="header-title">Context-Aware Support Assistant</h1>
        <p className="header-subtitle">AI Support Chat</p>
      </div>

      <div className="header-right">
        <RoleSelector
          role={role}
          onRoleChange={onRoleChange}
          disabled={isLoading}
        />
        <button
          type="button"
          onClick={onNewChat}
          className="new-chat-btn"
          disabled={isLoading}
          title="Start a new conversation session"
        >
          New Chat
        </button>
      </div>
    </header>
  );
}
