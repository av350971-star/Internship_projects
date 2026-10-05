import React, { useState, useEffect } from 'react';

export default function SettingsModal({
  isOpen,
  onClose,
  temperature,
  onChangeTemperature,
  config,
  apiOverrides,
  onSaveOverrides
}) {
  const [tempVal, setTempVal] = useState(temperature);
  const [baseUrl, setBaseUrl] = useState(apiOverrides.baseUrl || '');
  const [apiKey, setApiKey] = useState(apiOverrides.apiKey || '');

  useEffect(() => {
    setTempVal(temperature);
    setBaseUrl(apiOverrides.baseUrl || (config ? config.base_url : ''));
    setApiKey(apiOverrides.apiKey || '');
  }, [isOpen, temperature, apiOverrides, config]);

  if (!isOpen) return null;

  const handleSave = () => {
    onChangeTemperature(parseFloat(tempVal));
    onSaveOverrides({
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim()
    });
    onClose();
  };

  const getTempDescription = (val) => {
    if (val < 0.4) return 'Focused & Deterministic (Ideal for code & math)';
    if (val <= 0.8) return 'Balanced (General conversation & creativity)';
    return 'Highly Creative & Exploratory';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Settings & Hyperparameters</h3>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Temperature Slider */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="temp-slider">Temperature:</label>
              <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>
                {parseFloat(tempVal).toFixed(1)}
              </strong>
            </div>
            <div className="slider-container">
              <input
                id="temp-slider"
                type="range"
                min="0.0"
                max="2.0"
                step="0.1"
                value={tempVal}
                onChange={(e) => setTempVal(e.target.value)}
              />
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
              {getTempDescription(parseFloat(tempVal))}
            </span>
          </div>

          <hr style={{ borderColor: 'var(--border-subtle)' }} />

          {/* Provider Settings */}
          <div className="form-group">
            <label htmlFor="base-url-input">LLM Base URL:</label>
            <input
              id="base-url-input"
              type="text"
              className="form-input"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.openai.com/v1"
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              Works with OpenAI, Groq, OpenRouter, DeepSeek, or custom proxies.
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="api-key-input">LLM API Key:</label>
            <input
              id="api-key-input"
              type="password"
              className="form-input"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={config?.has_api_key ? 'Using key from .env (enter to override)' : 'Enter your API Key'}
            />
            {config?.has_api_key && (
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-latency)' }}>
                ✓ Server .env key active ({config.masked_api_key})
              </span>
            )}
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
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
