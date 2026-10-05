import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Brain, 
  Activity, 
  Terminal, 
  Shield, 
  Sparkles, 
  UserCheck 
} from 'lucide-react';
import Chat from './components/Chat';
import MemoryList from './components/MemoryList';
import MemoryActivity from './components/MemoryActivity';
import MemoryDebug from './components/MemoryDebug';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [sessionId, setSessionId] = useState('');
  const [lastChatData, setLastChatData] = useState(null);
  const [memoryCount, setMemoryCount] = useState(0);

  const fetchActiveMemoryCount = async () => {
    try {
      const res = await fetch('/api/memory?status=active');
      if (res.ok) {
        const data = await res.json();
        setMemoryCount(data.length);
      }
    } catch (err) {
      console.error('Failed to fetch memory count:', err);
    }
  };

  useEffect(() => {
    fetchActiveMemoryCount();
  }, []);

  const handleChatResponse = (chatData) => {
    setLastChatData(chatData);
    fetchActiveMemoryCount();
  };

  return (
    <div className="app-layout">
      {/* Top Application Header */}
      <header className="app-header glass-panel">
        <div className="brand-section">
          <div className="logo-icon">
            <Brain className="text-indigo-400" size={24} />
          </div>
          <div>
            <h1 className="brand-title">Controlled Memory Assistant</h1>
            <span className="brand-subtitle">
              Session State <span className="text-indigo-400">≠</span> Long-Term Memory
            </span>
          </div>
        </div>

        {/* Global Navigation Bar */}
        <nav className="nav-tabs">
          <button
            className={`nav-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            <MessageSquare size={16} />
            <span>Chat</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'memories' ? 'active' : ''}`}
            onClick={() => setActiveTab('memories')}
          >
            <Brain size={16} />
            <span>My Memories</span>
            {memoryCount > 0 && (
              <span className="nav-counter">{memoryCount}</span>
            )}
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            <Activity size={16} />
            <span>Activity</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'debug' ? 'active' : ''}`}
            onClick={() => setActiveTab('debug')}
          >
            <Terminal size={16} />
            <span>Debug</span>
          </button>
        </nav>

        {/* User Context & Identity Indicator */}
        <div className="user-profile-badge">
          <UserCheck size={15} className="text-emerald-400" />
          <div className="user-details">
            <span className="user-id mono-text">USER-1001</span>
            <span className="text-xs text-muted">Tenant Isolated</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        {activeTab === 'chat' && (
          <Chat
            sessionId={sessionId}
            onSessionChange={setSessionId}
            onChatResponse={handleChatResponse}
            onNavigateToMemories={() => setActiveTab('memories')}
          />
        )}

        {activeTab === 'memories' && (
          <MemoryList onMemoryChanged={fetchActiveMemoryCount} />
        )}

        {activeTab === 'activity' && (
          <MemoryActivity />
        )}

        {activeTab === 'debug' && (
          <MemoryDebug lastChatData={lastChatData} sessionId={sessionId} />
        )}
      </main>
    </div>
  );
}
