import React, { useState, useEffect } from 'react';
import { X, Save, Sparkles } from 'lucide-react';

export default function MemoryEditor({ memory, onClose, onSave }) {
  const [formData, setFormData] = useState({
    memory_type: 'preference',
    content: '',
    confidence: 0.95,
    importance: 0.80,
    status: 'active'
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (memory) {
      setFormData({
        memory_type: memory.memory_type,
        content: memory.content,
        confidence: memory.confidence,
        importance: memory.importance,
        status: memory.status
      });
    }
  }, [memory]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.content.trim()) {
      setError('Memory content is required.');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel animate-fade">
        <div className="modal-header">
          <div className="modal-title">
            <Sparkles size={20} className="text-indigo-400" />
            <h3>{memory ? 'Edit Long-Term Memory' : 'Create Long-Term Memory'}</h3>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {error && <div className="modal-error">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Memory Category</label>
            <select
              value={formData.memory_type}
              onChange={(e) => setFormData({ ...formData, memory_type: e.target.value })}
              className="input-field"
            >
              <option value="preference">Preference (User likes/dislikes or preferred styles)</option>
              <option value="procedural">Procedural (How the assistant should perform tasks)</option>
              <option value="semantic">Semantic (Facts known about user)</option>
              <option value="episodic">Episodic (Past events and interactions)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Memory Content</label>
            <textarea
              rows={3}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="e.g. User prefers step-by-step explanations."
              className="input-field"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>
                Confidence: <span className="mono-text font-semibold">{formData.confidence.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={formData.confidence}
                onChange={(e) => setFormData({ ...formData, confidence: parseFloat(e.target.value) })}
                className="slider-input"
              />
              <span className="text-xs text-muted">Threshold for injection is ≥ 0.70</span>
            </div>

            <div className="form-group">
              <label>
                Importance: <span className="mono-text font-semibold">{formData.importance.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={formData.importance}
                onChange={(e) => setFormData({ ...formData, importance: parseFloat(e.target.value) })}
                className="slider-input"
              />
              <span className="text-xs text-muted">Weights into final relevance score</span>
            </div>
          </div>

          {memory && (
            <div className="form-group">
              <label>Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="input-field"
              >
                <option value="active">Active (Eligible for retrieval)</option>
                <option value="deleted">Deleted (Soft-deleted, barred from injection)</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Save size={16} />
              Save Memory
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
