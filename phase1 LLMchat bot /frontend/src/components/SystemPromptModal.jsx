import React, { useState, useEffect } from 'react';

export default function SystemPromptModal({
  isOpen,
  onClose,
  currentPrompt,
  presets,
  onSave
}) {
  const [promptText, setPromptText] = useState(currentPrompt || '');

  useEffect(() => {
    setPromptText(currentPrompt || '');
  }, [currentPrompt, isOpen]);

  if (!isOpen) return null;

  const handleSelectPreset = (presetText) => {
    setPromptText(presetText);
  };

  const handleSave = () => {
    onSave(promptText);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Custom Instructions (System Prompt)</h3>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
            The system prompt sets the behavior, tone, and constraints of the assistant. It is passed as <code>role: 'system'</code> at index 0 of every conversation turn.
          </p>

          <div className="form-group">
            <label>Quick Presets:</label>
            <div className="preset-chip-list">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  className="preset-chip"
                  onClick={() => handleSelectPreset(preset.prompt)}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="system-textarea">System Prompt Instructions:</label>
            <textarea
              id="system-textarea"
              className="modal-textarea"
              rows={4}
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="e.g. You are an expert Python programming mentor..."
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="pill-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="pill-btn"
            style={{ background: 'var(--primary)', color: '#fff', border: 'none' }}
            onClick={handleSave}
          >
            Apply Instructions
          </button>
        </div>
      </div>
    </div>
  );
}
