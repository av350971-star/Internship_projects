import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  RotateCcw, 
  Brain, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Terminal, 
  Trash2,
  ChevronRight,
  Info
} from 'lucide-react';

export default function Chat({ 
  sessionId, 
  onSessionChange, 
  onChatResponse, 
  onNavigateToMemories 
}) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTask, setActiveTask] = useState('general_conversation');
  const [bannerNotice, setBannerNotice] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load active session state on mount or session change
  const loadSession = async () => {
    try {
      const url = sessionId ? `/api/session/current?session_id=${sessionId}` : '/api/session/current';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        onSessionChange(data.session_id);
        setActiveTask(data.current_task || 'general_conversation');
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages);
        } else {
          setMessages([]);
        }
      }
    } catch (err) {
      console.error('Failed to load session:', err);
    }
  };

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (customText = null) => {
    const text = (customText !== null ? customText : inputMessage).trim();
    if (!text || loading) return;

    // Optimistically add user message
    const userMsg = {
      id: `USR-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    if (customText === null) setInputMessage('');
    setLoading(true);
    setBannerNotice(null);

    try {
      const res = await fetch('/api/personalized/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          session_id: sessionId
        })
      });

      if (res.ok) {
        const data = await res.json();
        onSessionChange(data.session_id);

        const assistantMsg = {
          id: `AST-${Date.now()}`,
          role: 'assistant',
          content: data.answer,
          timestamp: new Date().toISOString(),
          memory: data.memory,
          memory_context: data.memory_context,
          latency_ms: data.latency_ms,
          decision_summary: data.decision_summary
        };

        setMessages(prev => [...prev, assistantMsg]);
        onChatResponse(data);

        // Notify if memory decision occurred
        if (data.decision_summary && data.decision_summary.action !== 'IGNORE') {
          const action = data.decision_summary.action;
          setBannerNotice({
            type: action === 'DELETE' ? 'danger' : 'success',
            text: action === 'DELETE' 
              ? `Memory forgotten: "${data.decision_summary.content}"` 
              : `Long-term memory ${action.toLowerCase()}d: "${data.decision_summary.content}"`
          });
        }
      } else {
        const errorMsg = {
          id: `ERR-${Date.now()}`,
          role: 'assistant',
          content: 'An error occurred while communicating with the assistant.',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetSession = async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/session/reset?session_id=${sessionId}`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setMessages([]);
        setBannerNotice({
          type: 'info',
          text: `Session conversation history wiped. ${data.memories_preserved_count} long-term memories preserved intact.`
        });
      }
    } catch (err) {
      console.error('Reset session error:', err);
    }
  };

  const executeScenarioStep = (stepNumber) => {
    switch (stepNumber) {
      case 1:
        handleSendMessage('Remember that I prefer step-by-step Python explanations.');
        break;
      case 2:
        handleResetSession();
        break;
      case 3:
        handleSendMessage('Explain this Python function.');
        break;
      case 4:
        handleSendMessage('What is the capital of France?');
        break;
      case 5:
        handleSendMessage('Forget that I prefer step-by-step Python explanations.');
        break;
      default:
        break;
    }
  };

  return (
    <div className="chat-container animate-fade">
      {/* Session Top Bar */}
      <div className="chat-header glass-panel">
        <div className="session-info">
          <div className="session-id-pill mono-text">
            <span className="indicator-dot online"></span>
            {sessionId || 'Initializing...'}
          </div>
          <span className="task-pill">
            <Terminal size={12} /> {activeTask}
          </span>
        </div>

        <div className="session-actions">
          <button 
            className="btn btn-danger-outline btn-sm" 
            onClick={handleResetSession}
            title="Reset short-term conversation state while preserving long-term memory"
          >
            <RotateCcw size={14} />
            Reset Session
          </button>
        </div>
      </div>

      {/* Demo Scenario Walkthrough Bar */}
      <div className="demo-workflow-bar glass-panel">
        <div className="demo-label">
          <Sparkles size={14} className="text-amber-400" />
          <span>Section 38 Scenario:</span>
        </div>
        <div className="demo-buttons">
          <button className="demo-step-btn" onClick={() => executeScenarioStep(1)}>
            1. Remember Preference
          </button>
          <button className="demo-step-btn" onClick={() => executeScenarioStep(2)}>
            2. Reset Session
          </button>
          <button className="demo-step-btn" onClick={() => executeScenarioStep(3)}>
            3. Ask Python (Injected)
          </button>
          <button className="demo-step-btn" onClick={() => executeScenarioStep(4)}>
            4. Ask France (Rejected)
          </button>
          <button className="demo-step-btn" onClick={() => executeScenarioStep(5)}>
            5. Forget Preference
          </button>
        </div>
      </div>

      {/* Persistent Notification Banner */}
      {bannerNotice && (
        <div className={`notice-banner banner-${bannerNotice.type} animate-fade`}>
          <CheckCircle2 size={16} />
          <span>{bannerNotice.text}</span>
          <button className="btn-close-notice" onClick={() => setBannerNotice(null)}>×</button>
        </div>
      )}

      {/* Chat Messages Stream */}
      <div className="messages-stream">
        {messages.length === 0 ? (
          <div className="empty-chat-state glass-panel">
            <Brain size={44} className="text-indigo-400 mb-2" />
            <h3>Personalized Assistant with Controlled Memory</h3>
            <p className="text-secondary text-sm max-w-md">
              Try instructing the assistant: <em>"Remember that I prefer step-by-step Python explanations."</em> Then reset the session to witness cross-session personalization!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            const injectedCount = msg.memory?.injected || 0;
            const retrievedCount = msg.memory?.retrieved || 0;

            return (
              <div key={msg.id} className={`message-bubble-wrapper ${isUser ? 'msg-user' : 'msg-assistant'}`}>
                <div className="message-content glass-panel">
                  <div className="message-text">
                    {msg.content.split('\n').map((line, idx) => (
                      <p key={idx}>{line || '\u00A0'}</p>
                    ))}
                  </div>

                  {/* Assistant Memory Chips */}
                  {!isUser && (
                    <div className="message-meta-bar">
                      {injectedCount > 0 ? (
                        <div 
                          className="memory-chip chip-injected" 
                          onClick={onNavigateToMemories}
                          title="Click to view memories in context"
                        >
                          <Brain size={13} />
                          <span>{injectedCount} {injectedCount === 1 ? 'memory' : 'memories'} injected</span>
                        </div>
                      ) : (
                        <div className="memory-chip chip-neutral" title="No memory qualified for this query">
                          <Brain size={13} />
                          <span>No memory injected</span>
                        </div>
                      )}

                      {retrievedCount > 0 && retrievedCount > injectedCount && (
                        <span className="text-xs text-muted">
                          ({retrievedCount - injectedCount} rejected by filters)
                        </span>
                      )}

                      {msg.latency_ms && (
                        <span className="mono-text text-xs text-muted latency-tag">
                          <Clock size={11} /> {msg.latency_ms}ms
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {loading && (
          <div className="message-bubble-wrapper msg-assistant">
            <div className="message-content glass-panel loading-bubble">
              <div className="typing-dots">
                <span></span><span></span><span></span>
              </div>
              <span className="text-xs text-muted ml-2">Evaluating memories and reasoning...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form 
        className="chat-input-bar glass-panel" 
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
      >
        <input
          type="text"
          className="chat-input"
          placeholder="Ask a question or say 'Remember that I prefer...'"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          disabled={loading}
        />
        <button 
          type="submit" 
          className="btn btn-primary btn-send" 
          disabled={loading || !inputMessage.trim()}
        >
          <Send size={16} />
          Send
        </button>
      </form>
    </div>
  );
}
