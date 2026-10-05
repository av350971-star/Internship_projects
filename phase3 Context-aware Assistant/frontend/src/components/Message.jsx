import React from 'react';
import DebugContext from './DebugContext';

/**
 * Message Component
 * Displays single chat message bubble (User or Assistant).
 */
export default function Message({ message }) {
  const isUser = message.sender === 'user';

  return (
    <div className={`message-row ${isUser ? 'message-row-user' : 'message-row-assistant'}`}>
      <div className={`message-container ${isUser ? 'message-user' : 'message-assistant'}`}>
        <div className="message-sender">
          {isUser ? 'You' : 'Assistant'}
        </div>

        <div className="message-bubble">
          {message.text.split('\n').map((paragraph, idx) => (
            paragraph.trim() ? (
              <p key={idx} className="message-paragraph">
                {paragraph}
              </p>
            ) : (
              <div key={idx} className="message-spacer" />
            )
          ))}
        </div>

        {/* Collapsible Context Debug View under Assistant messages */}
        {!isUser && message.debug_view && (
          <DebugContext debug={message.debug_view} />
        )}
      </div>
    </div>
  );
}
