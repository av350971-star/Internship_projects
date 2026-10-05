import React from 'react';

export default function Header({ tenants, currentTenant, onSelectTenant, activeTab, onSelectTab }) {
  return (
    <>
      <header className="app-header">
        <div className="brand-wrapper">
          <div className="brand-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              <line x1="9" y1="7" x2="15" y2="7"/>
              <line x1="9" y1="11" x2="13" y2="11"/>
            </svg>
          </div>
          <div>
            <h1 className="brand-title">Cited Knowledge Assistant</h1>
            <p className="brand-subtitle">Grounded Multi-Tenant Document RAG with Source Citations</p>
          </div>
        </div>

        <div className="header-controls">
          <div className="tenant-picker-box">
            <span className="tenant-label">Active Tenant:</span>
            <select 
              id="tenant-select"
              className="tenant-dropdown"
              value={currentTenant}
              onChange={(e) => onSelectTenant(e.target.value)}
            >
              {tenants.map(t => (
                <option key={t} value={t}>
                  {t === 'tenant_engineering' ? '⚡ Engineering Dept' : t === 'tenant_hr' ? '👥 Human Resources' : t}
                </option>
              ))}
            </select>
            <span className={`tenant-tag ${currentTenant === 'tenant_engineering' ? 'tenant-eng' : 'tenant-hr'}`}>
              {currentTenant === 'tenant_engineering' ? 'PORT: 8080 & K8s' : 'HR & POLICIES'}
            </span>
          </div>
        </div>
      </header>

      <nav className="nav-tabs">
        <button 
          id="tab-chat"
          className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => onSelectTab('chat')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Assistant Chat
        </button>

        <button 
          id="tab-documents"
          className={`tab-btn ${activeTab === 'documents' ? 'active' : ''}`}
          onClick={() => onSelectTab('documents')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          Document Manager
        </button>

        <button 
          id="tab-comparison"
          className={`tab-btn ${activeTab === 'comparison' ? 'active' : ''}`}
          onClick={() => onSelectTab('comparison')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          Search Comparison
        </button>

        <button 
          id="tab-evaluation"
          className={`tab-btn ${activeTab === 'evaluation' ? 'active' : ''}`}
          onClick={() => onSelectTab('evaluation')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          25-Question Benchmark
          <span className="tab-badge">25 Tests</span>
        </button>
      </nav>
    </>
  );
}
