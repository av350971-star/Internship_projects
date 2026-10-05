import React from 'react';

export default function Header({
  sidebarOpen,
  onToggleSidebar,
  models,
  selectedModel,
  onSelectModel,
  temperature,
  onOpenSystemPrompt,
  onOpenInspector,
  onResetSession,
  onOpenSettings
}) {
  return (
    <header className="top-header">
      <div className="header-left">
        <button
          className="btn-icon"
          onClick={onToggleSidebar}
          title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Dynamic Model Dropdown */}
        <div className="model-pill-selector">
          <select
            className="model-pill-dropdown"
            value={selectedModel}
            onChange={(e) => onSelectModel(e.target.value)}
            title="Model Selection"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="header-right">
        <button
          className="pill-btn"
          onClick={onOpenSettings}
          title="Adjust temperature and API keys"
        >
          <span>Temp: {temperature.toFixed(1)}</span>
        </button>

        <button
          className="pill-btn"
          onClick={onOpenSystemPrompt}
          title="System Instructions for Model"
        >
          <span>System Prompt</span>
        </button>

        <button
          className="pill-btn"
          onClick={onOpenInspector}
          title="Inspect raw HTTP messages and JSON response"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
          <span>Inspect</span>
        </button>

        <button
          className="pill-btn danger"
          onClick={onResetSession}
          title="Clear current conversation turns"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <polyline points="3 3 3 8 8 8" />
          </svg>
          <span>Reset</span>
        </button>
      </div>
    </header>
  );
}
