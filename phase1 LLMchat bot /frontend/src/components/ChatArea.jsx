import React, { useEffect, useRef } from 'react';
import ChatMessage from './ChatMessage.jsx';

export default function ChatArea({
  messages,
  isLoading,
  onInspectTurn,
  onSelectSuggestion
}) {
  const scrollEndRef = useRef(null);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const isEmpty = !messages || messages.length === 0;

  return (
    <div className="chat-scroll-area">
      <div className="chat-center-column">
        {isEmpty ? (
          <div className="empty-hero">
            <div className="hero-avatar">⚡</div>
            <h2 className="hero-title">What can I help with today?</h2>
            <p className="hero-sub">
              Direct, transparent LLM chat playground with configurable temperature, system prompt persona, and live telemetry.
            </p>

            <div className="prompt-grid">
              <div
                className="prompt-card"
                onClick={() => onSelectSuggestion('Explain how LLM temperature influences next-token probability distribution.')}
              >
                <strong>Explain LLM Temperature</strong>
                <span className="prompt-card-sub">Next-token probabilities & sampling</span>
              </div>

              <div
                className="prompt-card"
                onClick={() => onSelectSuggestion('Write a clean Python script for a binary search tree with insert and search methods.')}
              >
                <strong>Write a Binary Search Tree</strong>
                <span className="prompt-card-sub">Python OOP implementation</span>
              </div>

              <div
                className="prompt-card"
                onClick={() => onSelectSuggestion('Why is a chatbot an AI assistant but not an autonomous agent?')}
              >
                <strong>Assistant vs. Agent</strong>
                <span className="prompt-card-sub">Perception-action loops & tools</span>
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => (
            <ChatMessage
              key={index}
              message={msg}
              onInspect={() => onInspectTurn(msg)}
            />
          ))
        )}

        {isLoading && (
          <div className="message-group assistant">
            <div className="assistant-container">
              <div className="assistant-avatar">⚡</div>
              <div className="assistant-body">
                <div className="typing-dots">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={scrollEndRef} />
      </div>
    </div>
  );
}
