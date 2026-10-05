import React, { useRef, useEffect } from 'react';

export default function ChatInput({ input, setInput, onSend, isLoading }) {
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="bottom-input-container">
      <div className="floating-input-box">
        <textarea
          ref={textareaRef}
          className="input-textarea"
          rows={1}
          placeholder="Message LLM Playground..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />

        <button
          className="btn-submit-chat"
          onClick={onSend}
          disabled={!input.trim() || isLoading}
          title="Send message (Enter)"
        >
          {isLoading ? (
            <div className="typing-dots">
              <span className="dot" />
              <span className="dot" />
            </div>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          )}
        </button>
      </div>

      <div className="disclaimer-text">
        LLM Playground communicates directly with your LLM provider &bull; Multi-turn history preserved
      </div>
    </div>
  );
}
