import React from 'react';

/**
 * ChatInput Component
 * Controlled text input and Send button.
 */
export default function ChatInput({ value, onChange, onSendMessage, disabled }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;

    onSendMessage(trimmed);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form className="chat-input-form" onSubmit={handleSubmit}>
      <input
        type="text"
        className="chat-text-input"
        placeholder="Ask your question..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        autoFocus
      />
      <button
        type="submit"
        className="chat-send-btn"
        disabled={disabled || !value.trim()}
      >
        Send
      </button>
    </form>
  );
}
