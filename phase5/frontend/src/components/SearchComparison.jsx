import React, { useState } from 'react';

export default function SearchComparison({ currentTenant, onOpenCitation }) {
  const [query, setQuery] = useState('What causes error ERR-502-GATEWAY and what is the timeout?');
  const [loading, setLoading] = useState(false);
  const [comparisonData, setComparisonData] = useState(null);

  const sampleCompareQueries = [
    { label: "Code/Identifier (BM25 advantage)", text: "What causes error ERR-502-GATEWAY and what is the timeout?" },
    { label: "Semantic Paraphrase (Dense advantage)", text: "How do we prevent one single user from flooding our servers with spam requests?" },
    { label: "Port & Config Spec (Hybrid advantage)", text: "Which port does the Redis cluster run on and what is its eviction policy?" }
  ];

  const handleCompare = async (qText) => {
    const text = qText || query;
    if (!text.trim() || loading) return;

    setLoading(true);
    try {
      const resp = await fetch('/api/search/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: text,
          tenant_id: currentTenant,
          top_k: 4
        })
      });
      const data = await resp.json();
      setComparisonData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
          Dense vs. Sparse vs. Hybrid Retrieval Inspector
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Side-by-side scientific comparison proving why Hybrid (Dense + BM25) outperforms single-vector or keyword search alone.
        </p>
      </div>

      {/* Query Bar */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
        <input 
          type="text" 
          className="chat-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter a test query to analyze retrieval mechanisms..."
          disabled={loading}
        />
        <button 
          className="send-btn" 
          onClick={() => handleCompare()}
          disabled={loading || !query.trim()}
          style={{ minWidth: '150px' }}
        >
          {loading ? 'Comparing...' : 'Run Comparison'}
        </button>
      </div>

      {/* Preset Chips */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {sampleCompareQueries.map((item, idx) => (
          <button 
            key={idx}
            className="prompt-chip"
            onClick={() => {
              setQuery(item.text);
              handleCompare(item.text);
            }}
          >
            <strong>{item.label}:</strong> "{item.text.slice(0, 45)}..."
          </button>
        ))}
      </div>

      {/* Comparison Grid */}
      {comparisonData ? (
        <>
          <div style={{
            background: 'rgba(15, 23, 42, 0.5)',
            border: '1px solid var(--border-color)',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            fontSize: '0.85rem'
          }}>
            <strong>🔬 Analysis Summary:</strong>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              {comparisonData.summary}
            </p>
          </div>

          <div className="comparison-grid">
            {/* Column 1: Dense Retrieval */}
            <div className="retrieval-col">
              <div className="retrieval-col-header">
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Dense Retrieval</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>MiniLM-L6-v2 (Cosine)</span>
                </div>
                <span className="retrieval-mode-badge dense-badge">Semantic Vector</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {comparisonData.dense_results.map((c, i) => (
                  <div 
                    key={c.id || i}
                    className="citation-card"
                    onClick={() => onOpenCitation(c)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="citation-card-header">
                      <span className="citation-badge" style={{ background: '#a855f7' }}>Rank #{c.dense_rank}</span>
                      <span className="citation-score" style={{ color: '#c084fc' }}>
                        {(c.dense_score * 100).toFixed(1)}%
                      </span>
                    </div>
                    <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>{c.doc_filename}</strong>
                    <p className="citation-snippet">{c.text_content?.slice(0, 140)}...</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 2: Sparse (BM25) */}
            <div className="retrieval-col">
              <div className="retrieval-col-header">
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Sparse Retrieval</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Okapi BM25 (Keywords)</span>
                </div>
                <span className="retrieval-mode-badge sparse-badge">Exact Tokens</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {comparisonData.sparse_results.map((c, i) => (
                  <div 
                    key={c.id || i}
                    className="citation-card"
                    onClick={() => onOpenCitation(c)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="citation-card-header">
                      <span className="citation-badge" style={{ background: '#f59e0b' }}>Rank #{c.sparse_rank}</span>
                      <span className="citation-score" style={{ color: '#fbbf24' }}>
                        {(c.sparse_score * 100).toFixed(1)}%
                      </span>
                    </div>
                    <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>{c.doc_filename}</strong>
                    <p className="citation-snippet">{c.text_content?.slice(0, 140)}...</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 3: Hybrid Search */}
            <div className="retrieval-col" style={{ border: '1px solid rgba(16, 185, 129, 0.4)', background: 'rgba(16, 185, 129, 0.03)' }}>
              <div className="retrieval-col-header">
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#34d399' }}>Hybrid Fused</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dense (50%) + BM25 (50%)</span>
                </div>
                <span className="retrieval-mode-badge hybrid-badge">Optimal Score</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {comparisonData.hybrid_results.map((c, i) => (
                  <div 
                    key={c.id || i}
                    className="citation-card"
                    onClick={() => onOpenCitation(c)}
                    style={{ cursor: 'pointer', borderLeft: '3px solid #10b981' }}
                  >
                    <div className="citation-card-header">
                      <span className="citation-badge" style={{ background: '#10b981' }}>Final #{c.rank}</span>
                      <span className="citation-score" style={{ color: '#34d399', fontWeight: 700 }}>
                        {(c.score * 100).toFixed(1)}%
                      </span>
                    </div>
                    <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>{c.doc_filename}</strong>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      Dense: {(c.dense_score * 100).toFixed(0)}% | BM25: {(c.sparse_score * 100).toFixed(0)}%
                    </div>
                    <p className="citation-snippet">{c.text_content?.slice(0, 140)}...</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
          Click "Run Comparison" above to visualize how Dense, Sparse, and Hybrid retrievers rank different chunks!
        </div>
      )}
    </div>
  );
}
