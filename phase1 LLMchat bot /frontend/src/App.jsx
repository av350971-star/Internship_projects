import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Header from './components/Header.jsx';
import ChatArea from './components/ChatArea.jsx';
import ChatInput from './components/ChatInput.jsx';
import SystemPromptModal from './components/SystemPromptModal.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import RawInspectorModal from './components/RawInspectorModal.jsx';
import Toast from './components/Toast.jsx';

export default function App() {
  const [config, setConfig] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Modals & Panels
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isSystemPromptOpen, setIsSystemPromptOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  // Telemetry Inspection
  const [lastRawRequest, setLastRawRequest] = useState(null);
  const [lastRawResponse, setLastRawResponse] = useState(null);

  // API Overrides
  const [apiOverrides, setApiOverrides] = useState({
    baseUrl: localStorage.getItem('llm_base_url_override') || '',
    apiKey: localStorage.getItem('llm_api_key_override') || ''
  });

  // Notifications
  const [toasts, setToasts] = useState([]);

  const showToast = (text, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  // 1. Initial Load: Fetch Config & Sessions
  useEffect(() => {
    async function init() {
      try {
        const confRes = await fetch('/api/config');
        if (confRes.ok) {
          const confData = await confRes.json();
          setConfig(confData);
        }

        const sessRes = await fetch('/api/sessions');
        if (sessRes.ok) {
          const sessData = await sessRes.json();
          setSessions(sessData);
          if (sessData.length > 0) {
            await selectSession(sessData[0].id);
          } else {
            await handleNewSession();
          }
        }
      } catch (err) {
        showToast('Failed to connect to backend: ' + err.message, 'error');
      }
    }
    init();
  }, []);

  // 2. Select a Session
  const selectSession = async (sessionId) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      if (!res.ok) throw new Error('Session not found');
      const data = await res.json();

      // Ensure model is valid from current models catalog or fallback to default
      const allowedModels = ['gemini-3.8-flash',  'gemini-3.1-flash-lite'];
      if (!allowedModels.includes(data.model)) {
        data.model = config?.default_model || 'gemini-3.8-flash';
      }

      setActiveSessionId(data.id);
      setCurrentSession(data);

      // Preload inspector preview from latest assistant message
      const lastAss = [...(data.messages || [])].reverse().find((m) => m.role === 'assistant');
      if (lastAss && lastAss.metrics) {
        setLastRawResponse({
          model: data.model,
          usage: {
            prompt_tokens: lastAss.metrics.prompt_tokens,
            completion_tokens: lastAss.metrics.completion_tokens,
            total_tokens: lastAss.metrics.total_tokens
          },
          sample_content: lastAss.content
        });
      }
    } catch (err) {
      showToast('Error loading session: ' + err.message, 'error');
    }
  };

  // 3. Create New Session
  const handleNewSession = async () => {
    try {
      const defaultModel = currentSession?.model || config?.default_model || 'gemini-3.8-flash';
      const defaultTemp = currentSession?.temperature ?? config?.default_temperature ?? 0.7;
      const defaultSys = config?.default_system_prompt || 'You are an expert programming tutor for BCA students. Explain concepts step-by-step with clean code snippets and concise explanations.';

      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Chat',
          system_prompt: defaultSys,
          model: defaultModel,
          temperature: defaultTemp
        })
      });

      if (!res.ok) throw new Error('Could not create session');
      const newSess = await res.json();
      setSessions((prev) => [newSess, ...prev]);
      await selectSession(newSess.id);
      showToast('Created new conversation', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // 4. Delete Session
  const handleDeleteSession = async (sessionId, title) => {
    if (!confirm(`Delete chat "${title}"?`)) return;
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Could not delete session');

      const updated = sessions.filter((s) => s.id !== sessionId);
      setSessions(updated);
      showToast('Conversation deleted', 'info');

      if (activeSessionId === sessionId) {
        if (updated.length > 0) {
          await selectSession(updated[0].id);
        } else {
          await handleNewSession();
        }
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // 5. Reset Conversation History
  const handleResetSession = async () => {
    if (!activeSessionId) return;
    if (!confirm('Clear all conversation turns in this chat? (Your system prompt & settings will be preserved)')) return;

    try {
      const res = await fetch(`/api/sessions/${activeSessionId}/reset`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to reset session');
      const data = await res.json();
      setCurrentSession(data.session);
      showToast('Conversation cleared', 'success');

      // Update sidebar session list
      setSessions((prev) =>
        prev.map((s) => (s.id === activeSessionId ? { ...s, message_count: 0 } : s))
      );
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // 6. Select Model
  const handleSelectModel = async (modelId) => {
    if (!currentSession) return;
    setCurrentSession((prev) => ({ ...prev, model: modelId }));

    try {
      await fetch(`/api/sessions/${activeSessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelId })
      });
    } catch (e) {
      console.error(e);
    }
  };

  // 7. Change Temperature
  const handleChangeTemperature = async (tempVal) => {
    if (!currentSession) return;
    setCurrentSession((prev) => ({ ...prev, temperature: tempVal }));

    try {
      await fetch(`/api/sessions/${activeSessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temperature: tempVal })
      });
      showToast(`Temperature set to ${tempVal.toFixed(1)}`, 'success');
    } catch (e) {
      console.error(e);
    }
  };

  // 8. Save System Prompt
  const handleSaveSystemPrompt = async (newPrompt) => {
    if (!currentSession) return;
    setCurrentSession((prev) => ({ ...prev, system_prompt: newPrompt }));

    try {
      await fetch(`/api/sessions/${activeSessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system_prompt: newPrompt })
      });
      showToast('System prompt instructions updated', 'success');
    } catch (err) {
      showToast('Failed to update system prompt: ' + err.message, 'error');
    }
  };

  // 9. Save API Overrides (Settings Modal)
  const handleSaveOverrides = (overrides) => {
    setApiOverrides(overrides);
    if (overrides.baseUrl) {
      localStorage.setItem('llm_base_url_override', overrides.baseUrl);
    } else {
      localStorage.removeItem('llm_base_url_override');
    }

    if (overrides.apiKey) {
      localStorage.setItem('llm_api_key_override', overrides.apiKey);
    } else {
      localStorage.removeItem('llm_api_key_override');
    }
    showToast('Settings saved', 'success');
  };

  // 10. Send Chat Message
  const handleSendMessage = async (textOverride = null) => {
    if (isLoading) return;
    const msgText = (textOverride || input).trim();
    if (!msgText) return;

    if (!activeSessionId) {
      showToast('Please create or select a chat first.', 'error');
      return;
    }

    // Optimistically add user message
    const userMessage = {
      role: 'user',
      content: msgText,
      timestamp: new Date().toISOString()
    };

    setCurrentSession((prev) => ({
      ...prev,
      messages: [...(prev?.messages || []), userMessage]
    }));

    setInput('');
    setIsLoading(true);

    const payload = {
      session_id: activeSessionId,
      message: msgText,
      system_prompt: currentSession?.system_prompt,
      model: currentSession?.model || config?.default_model,
      temperature: currentSession?.temperature ?? config?.default_temperature,
      api_key_override: apiOverrides.apiKey || null,
      base_url_override: apiOverrides.baseUrl || null
    };

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Server returned HTTP ${res.status}`);
      }

      const data = await res.json();

      // Save raw payloads for inspector
      setLastRawRequest(data.raw_request);
      setLastRawResponse(data.raw_response);

      // Append assistant reply
      setCurrentSession((prev) => ({
        ...prev,
        messages: [...(prev?.messages || []), data.message]
      }));

      // Refresh sidebar sessions list (title or message count might have updated)
      const sessRes = await fetch('/api/sessions');
      if (sessRes.ok) {
        const sessList = await sessRes.json();
        setSessions(sessList);
      }
    } catch (err) {
      console.error('Chat error:', err);
      showToast(err.message, 'error');

      // Append error message cleanly in chat
      const errorReply = {
        role: 'assistant',
        content: `⚠️ **Interaction Error**\n\n${err.message}\n\n*Check your API key in \`.env\` or click the Settings gear icon to verify your Base URL.*`,
        timestamp: new Date().toISOString()
      };
      setCurrentSession((prev) => ({
        ...prev,
        messages: [...(prev?.messages || []), errorReply]
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Inspect turn handler
  const handleInspectTurn = (msg) => {
    if (msg.metrics) {
      setLastRawResponse({
        turn_timestamp: msg.timestamp,
        metrics: msg.metrics,
        assistant_content: msg.content
      });
    }
    setIsInspectorOpen(true);
  };

  return (
    <div className="app-container">
      {/* ChatGPT Collapsible Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={selectSession}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        onOpenSystemPrompt={() => setIsSystemPromptOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main ChatGPT Workspace */}
      <main className="main-workspace">
        <Header
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          models={config?.models || [
            { id: 'gemini-3.8-flash', name: 'gemini-3.8-flash (Default)' },
            { id: 'gemini-2.5-flash', name: 'gemini-2.5-flash' },
            { id: 'gemini-3.1-flash-lite', name: 'gemini-3.1-flash-lite' }
          ]}
          selectedModel={currentSession?.model || config?.default_model || 'gemini-3.8-flash'}
          onSelectModel={handleSelectModel}
          temperature={currentSession?.temperature ?? config?.default_temperature ?? 0.7}
          onOpenSystemPrompt={() => setIsSystemPromptOpen(true)}
          onOpenInspector={() => setIsInspectorOpen(true)}
          onResetSession={handleResetSession}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {/* Centered Chat Feed */}
        <ChatArea
          messages={currentSession?.messages || []}
          isLoading={isLoading}
          onInspectTurn={handleInspectTurn}
          onSelectSuggestion={(prompt) => handleSendMessage(prompt)}
        />

        {/* ChatGPT Style Floating Input Capsule */}
        <ChatInput
          input={input}
          setInput={setInput}
          onSend={() => handleSendMessage()}
          isLoading={isLoading}
        />
      </main>

      {/* Modals */}
      <SystemPromptModal
        isOpen={isSystemPromptOpen}
        onClose={() => setIsSystemPromptOpen(false)}
        currentPrompt={currentSession?.system_prompt || config?.default_system_prompt}
        presets={config?.system_prompts || []}
        onSave={handleSaveSystemPrompt}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        temperature={currentSession?.temperature ?? config?.default_temperature ?? 0.7}
        onChangeTemperature={handleChangeTemperature}
        config={config}
        apiOverrides={apiOverrides}
        onSaveOverrides={handleSaveOverrides}
      />

      <RawInspectorModal
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        rawRequest={lastRawRequest}
        rawResponse={lastRawResponse}
      />

      {/* Toast Notifications */}
      <Toast toasts={toasts} />
    </div>
  );
}
