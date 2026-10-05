import React, { useState } from 'react';
import { Layers, Sparkles, ArrowRight, Gauge, Clock, ShieldCheck } from 'lucide-react';
import ResultCard from './ResultCard';

export default function CompareTab({
  benchmarkQueries,
  onCompare,
  compareData,
  loading,
  error
}) {
  const [query, setQuery] = useState(
    benchmarkQueries?.[0]?.query || "What is the difference between precision and recall in classification?"
  );
  const [topK, setTopK] = useState(3);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    onCompare({ query, top_k: topK });
  };

  const handleQuerySelect = (q) => {
    setQuery(q);
    onCompare({ query: q, top_k: topK });
  };

  const confA = compareData?.config_a;
  const confB = compareData?.config_b;
  const summary = compareData?.summary;

  return (
    <div>
      {/* Search Header for Side-by-Side Comparison */}
      <div className="glass-card search-controls-box">
        <form onSubmit={handleSubmit} className="search-input-wrapper">
          <Layers className="search-icon-left" size={20} />
          <input
            type="text"
            className="main-search-input"
            placeholder="Type query to compare chunking configs side-by-side..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className="search-submit-btn" disabled={loading || !query.trim()}>
            {loading ? <div className="spinner" /> : <Layers size={16} />}
            <span>Compare</span>
          </button>
        </form>

        {/* Hand-written query chips for fast evaluation */}
        <div className="quick-queries-row">
          <span className="quick-label">
            <Sparkles size={13} style={{ display: 'inline', marginRight: '4px' }} />
            Hand-Written Test Queries:
          </span>
          {benchmarkQueries?.map((b) => (
            <button
              key={b.id}
              type="button"
              className="query-chip"
              onClick={() => handleQuerySelect(b.query)}
            >
              {b.query.length > 45 ? b.query.substring(0, 45) + '...' : b.query}
            </button>
          ))}
        </div>
      </div>

      {/* Analytical Observation Banner */}
      {summary && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(168, 85, 247, 0.1))',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
              Retrieval Layer Evaluation
            </div>
            <div style={{ fontSize: '0.96rem', color: '#f8fafc', marginTop: '4px', fontWeight: 500 }}>
              {summary.observation}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
              Faster: <strong style={{ color: '#10b981' }}>{summary.faster_config}</strong> ({summary.latency_diff_ms} ms diff)
            </div>
          </div>
        </div>
      )}

      {/* Side-by-Side Comparison Columns */}
      {compareData ? (
        <div className="comparison-grid">
          {/* Column A: Config A */}
          <div className="compare-column">
            <div className="compare-col-header col-header-a">
              <div>
                <div className="col-header-title">Config A: Fine-Grained (300 Chars)</div>
                <div style={{ fontSize: '0.75rem', color: '#93c5fd' }}>
                  Chunk Size: 300 | Overlap: 50 | 410 Chunks
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#60a5fa' }}>
                  {confA?.stats?.top_score}%
                </div>
                <div style={{ fontSize: '0.7rem', color: '#93c5fd' }}>Top Match Score</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', fontSize: '0.78rem', color: '#94a3b8', padding: '0 4px' }}>
              <span>Avg Score: <strong>{confA?.stats?.avg_score}%</strong></span>
              <span>•</span>
              <span>Avg Size: <strong>{confA?.stats?.avg_length} chars</strong></span>
              <span>•</span>
              <span>Latency: <strong>{confA?.latency_ms} ms</strong></span>
            </div>

            <div className="results-list">
              {confA?.results?.map((item) => (
                <ResultCard key={item.id} item={item} configColor="#3b82f6" />
              ))}
            </div>
          </div>

          {/* Column B: Config B */}
          <div className="compare-column">
            <div className="compare-col-header col-header-b">
              <div>
                <div className="col-header-title">Config B: Broad Context (800 Chars)</div>
                <div style={{ fontSize: '0.75rem', color: '#d8b4fe' }}>
                  Chunk Size: 800 | Overlap: 150 | 172 Chunks
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#c084fc' }}>
                  {confB?.stats?.top_score}%
                </div>
                <div style={{ fontSize: '0.7rem', color: '#d8b4fe' }}>Top Match Score</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', fontSize: '0.78rem', color: '#94a3b8', padding: '0 4px' }}>
              <span>Avg Score: <strong>{confB?.stats?.avg_score}%</strong></span>
              <span>•</span>
              <span>Avg Size: <strong>{confB?.stats?.avg_length} chars</strong></span>
              <span>•</span>
              <span>Latency: <strong>{confB?.latency_ms} ms</strong></span>
            </div>

            <div className="results-list">
              {confB?.results?.map((item) => (
                <ResultCard key={item.id} item={item} configColor="#a855f7" />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card empty-state">
          <Layers size={40} />
          <h3>Compare Chunking Configurations</h3>
          <p style={{ marginTop: '8px', maxWidth: '500px', margin: '8px auto 0' }}>
            Select any hand-written test query above or type a new query to inspect
            how small vs large chunks perform side-by-side.
          </p>
        </div>
      )}
    </div>
  );
}
