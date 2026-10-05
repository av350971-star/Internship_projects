import React, { useState } from 'react';
import { Key, Check, Shield } from 'lucide-react';
import { getApiKey, setApiKey, DEFAULT_API_KEY } from '../lib/api';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [key, setKey] = useState(getApiKey());
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setApiKey(key.trim());
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onSaved();
      onClose();
    }, 600);
  };

  const handleResetDefault = () => {
    setKey(DEFAULT_API_KEY);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-md rounded-2xl border border-slate-800 p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">MCP Security Key</h3>
              <p className="text-xs text-slate-400">X-API-Key header required for MCP calls</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white px-2 py-1 rounded-lg">
            ✕
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="text-slate-400 font-semibold block mb-1">Active X-API-Key</label>
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="e.g. dev-local-key-123"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Default key: <code className="text-slate-400 font-mono">{DEFAULT_API_KEY}</code></span>
            <button
              type="button"
              onClick={handleResetDefault}
              className="text-indigo-400 hover:underline"
            >
              Reset to default
            </button>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center space-x-1.5 shadow-lg shadow-indigo-600/30 transition"
          >
            {savedSuccess ? <Check className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
            <span>{savedSuccess ? 'Saved!' : 'Save Key'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
