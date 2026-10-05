import React, { useState } from 'react';

const SAMPLE_QUERIES = {
  tenant_engineering: [
    "What is the token expiration window for JWT access tokens?",
    "What base Docker image is used for the production container?",
    "What port does the corporate bastion host listen on?",
    "What command should be run to rollback a failed deployment?",
    "What causes error ERR-502-GATEWAY and what is the timeout value?",
    "What is our company stock price on NASDAQ?" // Out of domain -> Weak evidence decline
  ],
  tenant_hr: [
    "How many days of Casual Leave are allocated per year?",
    "What are the official daily working hours and core collaboration hours?",
    "What laptop does a new hire receive and what is the bonus tier?",
    "Can I save my remaining vacation days for next year?",
    "If an employee transfers to Pune, how much relocation budget do they get?",
    "What is the corporate discount on buying an iPhone?" // Out of domain -> Weak evidence decline
  ]
};

export default function AssistantChat({ currentTenant, onOpenCitation }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I am your **Cited Knowledge Assistant**. Ask me any question about **${currentTenant === 'tenant_engineering' ? 'Engineering & Infrastructure' : 'HR & Company Policies'}**. Every claim I make will cite the exact document and chunk [1], and I will decline if evidence is insufficient.`,
      citations: [],
      is_declined: false,
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchMode, setSearchMode] = useState('hybrid');
  const [alpha, setAlpha] = useState(0.5);
  const [threshold, setThreshold] = useState(0.35);
  const [activeCitationList, setActiveCitationList] = useState([]);
  const [highlightedChunkId, setHighlightedChunkId] = useState(null);

  const handleSend = async (userQuery) => {
    const textToSend = (userQuery || query).trim();
    if (!textToSend || loading) return;

    const userMsg = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: textToSend,
          tenant_id: currentTenant,
          search_mode: searchMode,
          alpha: parseFloat(alpha),
          threshold: parseFloat(threshold)
        })
      });

      const data = await resp.json();

      const assistantMsg = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        content: data.answer,
        is_declined: data.is_declined,
        decline_reason: data.decline_reason,
        citations: data.citations || [],
        retrieved_chunks: data.retrieved_chunks || [],
        highest_score: data.highest_score,
        latency_ms: data.latency_ms,
        tokens: data.tokens,
        timestamp: new Date().toLocaleTimeString()
      };

      setMessages(prev => [...prev, assistantMsg]);
      setActiveCitationList(data.citations && data.citations.length > 0 ? data.citations : data.retrieved_chunks || []);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `Network or Server Error: ${err.message}`,
        is_declined: true,
        decline_reason: 'Connection failure',
        citations: [],
        timestamp: new Date().toLocaleTimeString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const renderContentWithCitations = (content, citations) => {
    if (!content) return null;
    
    // Split text by citation pattern like [1], [2], [1, 2]
    const parts = content.split(/(\[\d+\])/g);
    return parts.map((part, idx) => {
      const match = part.match(/\[(\d+)\]/);
      if (match) {
        const citationNum = parseInt(match[1], 10);
        const citObj = citations ? citations.find(c => c.citation_index === citationNum) : null;
        return (
          <span 
            key={idx} 
            className="citation-pill"
            title={citObj ? `Source: ${citObj.doc_filename} (Page ${citObj.page_number})` : `Citation [${citationNum}]`}
            onClick={() => {
              if (citObj) {
                onOpenCitation(citObj);
                setHighlightedChunkId(citObj.chunk_id);
              }
            }}
          >
            [{citationNum}]
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  const samplePrompts = SAMPLE_QUERIES[currentTenant] || [];

  return (
    <div className="chat-tab-grid">
      <div className="glass-panel chat-container">
        {/* Chat Control Bar */}
        <div className="chat-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="chat-header-title">Document Q&A</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Tenant: <strong style={{ color: 'var(--text-primary)' }}>{currentTenant}</strong>
            </span>
          </div>

          <div className="chat-settings-bar">
            <div>
              <label style={{ marginRight: '0.4rem', fontSize: '0.75rem' }}>Retrieval:</label>
              <select 
                value={searchMode} 
                onChange={(e) => setSearchMode(e.target.value)}
                style={{ 
                  background: 'var(--bg-secondary)', 
                  color: 'var(--text-primary)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '4px',
                  padding: '0.2rem 0.4rem',
                  fontSize: '0.78rem'
                }}
              >
                <option value="hybrid">⚡ Hybrid (Dense + BM25)</option>
                <option value="dense">🧠 Dense Only (MiniLM)</option>
                <option value="sparse">🔍 Sparse Only (BM25)</option>
              </select>
            </div>

            {searchMode === 'hybrid' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ fontSize: '0.75rem' }}>α: {alpha}</span>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.1" 
                  value={alpha} 
                  onChange={(e) => setAlpha(e.target.value)}
                  style={{ width: '60px' }}
                  title="Weight: 1.0=Dense only, 0.0=BM25 only"
                />
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ fontSize: '0.75rem' }}>Threshold: {threshold}</span>
              <input 
                type="range" 
                min="0.1" 
                max="0.8" 
                step="0.05" 
                value={threshold} 
                onChange={(e) => setThreshold(e.target.value)}
                style={{ width: '60px' }}
                title="Minimum confidence score needed before answering"
              />
            </div>
          </div>
        </div>

        {/* Message Stream */}
        <div className="chat-history">
          {messages.map((m) => (
            <div 
              key={m.id} 
              className={`message-bubble ${m.role === 'user' ? 'message-user' : 'message-assistant'}`}
            >
              <div className="message-header">
                <strong>{m.role === 'user' ? 'You' : 'Cited Assistant'}</strong>
                <span>• {m.timestamp}</span>

                {m.role === 'assistant' && m.highest_score !== undefined && (
                  <span style={{
                    fontSize: '0.72rem',
                    fontFamily: 'var(--font-mono)',
                    padding: '0.12rem 0.45rem',
                    borderRadius: '4px',
                    background: m.highest_score >= 0.55 ? 'rgba(16, 185, 129, 0.2)' : m.highest_score >= 0.35 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: m.highest_score >= 0.55 ? '#34d399' : m.highest_score >= 0.35 ? '#fbbf24' : '#f87171',
                    fontWeight: 700
                  }}>
                    {m.highest_score >= 0.55 ? '🟢 STRONG' : m.highest_score >= 0.35 ? '🟡 MODERATE' : '🔴 WEAK'} ({(m.highest_score * 100).toFixed(1)}%)
                  </span>
                )}

                {m.role === 'assistant' && (
                  <button 
                    onClick={() => navigator.clipboard.writeText(m.content)}
                    style={{ background: 'transparent', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer' }}
                    title="Copy response to clipboard"
                  >
                    📋
                  </button>
                )}

                {m.latency_ms && (
                  <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>
                    ⏱️ {m.latency_ms}ms
                  </span>
                )}
              </div>

              <div style={{ whiteSpace: 'pre-wrap' }}>
                {renderContentWithCitations(m.content, m.citations)}
              </div>

              {m.is_declined && (
                <div className="decline-alert">
                  <span className="decline-alert-icon">🛡️</span>
                  <div>
                    <strong>Evidence Guard Active:</strong>
                    <div className="decline-alert-text">
                      {m.decline_reason || "The evidence retrieved from the documents was below the confidence threshold. Hallucination strictly prevented."}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="message-bubble message-assistant" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⚙️</span>
              <span>Retrieving chunks, evaluating evidence gate, and attributing citations...</span>
            </div>
          )}
        </div>

        {/* Quick Prompts & Input */}
        <div className="chat-input-wrapper">
          <div className="quick-prompts-bar">
            {samplePrompts.map((p, i) => (
              <button 
                key={i} 
                className="prompt-chip"
                onClick={() => handleSend(p)}
                disabled={loading}
              >
                {p}
              </button>
            ))}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="input-box">
            <input 
              id="chat-input-box"
              type="text" 
              className="chat-input"
              placeholder={`Ask a question about ${currentTenant === 'tenant_engineering' ? 'Engineering docs' : 'HR policies'}...`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading}
            />
            <button 
              id="send-query-btn"
              type="submit" 
              className="send-btn"
              disabled={loading || !query.trim()}
            >
              <span>Ask</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </form>
        </div>
      </div>

      {/* Citation Sources Sidebar */}
      <div className="glass-panel citation-sidebar">
        <div className="sidebar-header">
          <h2 className="sidebar-title">Retrieved Evidence Chunks</h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {activeCitationList.length} Chunks
          </span>
        </div>

        <div className="citation-list">
          {activeCitationList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <p>No citations yet.</p>
              <p style={{ marginTop: '0.5rem', fontSize: '0.78rem' }}>
                Ask a question to see retrieved source chunks and verify inline citations!
              </p>
            </div>
          ) : (
            activeCitationList.map((c, i) => (
              <div 
                key={c.chunk_id || i}
                className={`citation-card ${highlightedChunkId === c.chunk_id ? 'highlighted' : ''}`}
                onClick={() => onOpenCitation(c)}
                style={{ cursor: 'pointer' }}
              >
                <div className="citation-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span className="citation-badge">
                      {c.citation_index ? `[${c.citation_index}]` : `#${i + 1}`}
                    </span>
                    <span className="citation-docname" title={c.doc_filename}>
                      {c.doc_filename}
                    </span>
                  </div>
                  <span className="citation-score">
                    {c.score ? `${(c.score * 100).toFixed(1)}%` : ''}
                  </span>
                </div>

                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Page {c.page_number} {c.section_title ? `• ${c.section_title}` : ''}
                </div>

                <div className="citation-snippet">
                  {c.snippet || c.text_content?.slice(0, 160) + '...'}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
