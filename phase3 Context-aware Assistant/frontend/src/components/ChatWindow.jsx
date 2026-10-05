import React, { useEffect, useRef } from 'react';
import Message from './Message';

/**
 * ChatWindow Component
 * Scrolls and displays the conversation thread.
 */
export default function ChatWindow({ messages, isLoading, currentRole }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="chat-window">
      {/* If empty, show the initial friendly greeting */}
      {messages.length === 0 && (
        <div className="empty-state">
          <div className="message-container message-assistant">
            <div className="message-sender">Assistant</div>
            <div className="message-bubble">
              <p className="message-paragraph">
                Hello! How can I help you today?
              </p>
              <p className="message-hint">
                Current role: <strong>{currentRole === 'customer' ? 'Customer' : 'Support Agent'}</strong>. You can switch roles at the top right.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Render all conversation messages */}
      {messages.map((msg) => (
        <Message key={msg.id} message={msg} />
      ))}

      {/* Loading indicator */}
      {isLoading && (
        <div className="message-row message-row-assistant">
          <div className="message-container message-assistant">
            <div className="message-sender">Assistant</div>
            <div className="message-bubble message-loading">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
