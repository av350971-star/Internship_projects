import React, { useState, useEffect } from 'react';

export default function EvaluationDashboard() {
  const [questions, setQuestions] = useState([]);
  const [results, setResults] = useState([]);
  const [running, setRunning] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [summary, setSummary] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    // Load questions on mount
    fetch('/api/evaluation/questions')
      .then(res => res.json())
      .then(data => setQuestions(data.questions || []))
      .catch(console.error);

    // Try loading past benchmark results if existing
    fetch('/api/documents') // quick ping
      .catch(console.error);
  }, []);

  const runAllBenchmark = async () => {
    setRunning(true);
    setResults([]);
    try {
      const resp = await fetch('/api/evaluation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await resp.json();
      setResults(data.results || []);
      setSummary({
        total: data.total_evaluated,
        passed: data.passed,
        failed: data.failed,
        passRate: data.pass_rate_percent,
        avgLatency: Math.round(
          data.results.reduce((acc, r) => acc + (r.latency_ms || 0), 0) / (data.results.length || 1)
        )
      });
    } catch (err) {
      console.error(err);
    } finally {
      setRunning(false);
    }
  };

  const runSingleTest = async (qId) => {
    try {
      const resp = await fetch('/api/evaluation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: qId })
      });
      const data = await resp.json();
      const updatedItem = data.results[0];
      setResults(prev => {
        const copy = [...prev];
        const idx = copy.findIndex(r => r.id === qId);
        if (idx >= 0) copy[idx] = updatedItem;
        else copy.push(updatedItem);
        return copy;
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportReport = async () => {
    try {
      const resp = await fetch('/api/evaluation/export');
      const data = await resp.json();
      const blob = new Blob([data.report_markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Cited_Assistant_Benchmark_Report.md';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    }
  };

  const categories = [
    { key: 'all', label: 'All Queries' },
    { key: 'direct_fact', label: 'Direct Fact' },
    { key: 'semantic_paraphrase', label: 'Semantic (Dense)' },
    { key: 'keyword_code', label: 'Keyword / Code (BM25)' },
    { key: 'cross_document', label: 'Cross-Doc' },
    { key: 'no_answer_unsupported', label: 'No-Answer (Decline)' },
    { key: 'adversarial_injection', label: 'Adversarial Attacks' },
    { key: 'cross_tenant_isolation', label: 'Tenant Isolation' }
  ];

  const filteredList = (results.length > 0 ? results : questions).filter(item => {
    if (activeCategory === 'all') return true;
    return item.category === activeCategory;
  });

  return (
    <div className="glass-panel" style={{ padding: '2rem' }}>
      <div className="benchmark-header">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
            25-Question Comprehensive Evaluation Benchmark
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Automated test suite evaluating citation grounding, weak evidence decline, adversarial resistance, and tenant isolation.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button 
            className="action-btn reindex-btn"
            style={{ padding: '0.65rem 1.1rem', fontSize: '0.85rem' }}
            onClick={handleExportReport}
            title="Download full Markdown benchmark report"
          >
            📥 Export Report (.md)
          </button>

          <button 
            id="run-benchmark-btn"
            className="send-btn"
            onClick={runAllBenchmark}
            disabled={running}
            style={{ minWidth: '180px' }}
          >
            {running ? 'Running 25 Tests...' : '▶ Run Full Benchmark'}
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {summary && (
        <div className="benchmark-stats-row">
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#6366f1' }}>{summary.total}</div>
            <div className="stat-label">Total Test Cases</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--success)' }}>{summary.passed}</div>
            <div className="stat-label">Passed Tests</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: summary.failed > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
              {summary.failed}
            </div>
            <div className="stat-label">Failed Tests</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: summary.passRate >= 90 ? 'var(--success)' : '#f59e0b' }}>
              {summary.passRate}%
            </div>
            <div className="stat-label">Benchmark Accuracy</div>
          </div>
        </div>
      )}

      {/* Category Filter Chips */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {categories.map(c => (
          <button
            key={c.key}
            className={`prompt-chip ${activeCategory === c.key ? 'active' : ''}`}
            onClick={() => setActiveCategory(c.key)}
            style={{
              background: activeCategory === c.key ? 'var(--accent-primary)' : 'var(--bg-secondary)',
              color: activeCategory === c.key ? '#fff' : 'var(--text-secondary)'
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Questions & Results Table */}
      <div className="eval-table-container">
        <table className="eval-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>ID</th>
              <th>Category</th>
              <th>Tenant</th>
              <th>Question</th>
              <th>Expected</th>
              <th>Actual Outcome</th>
              <th>Score</th>
              <th>Latency</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.map((item) => {
              const res = results.find(r => r.id === item.id);
              const isPassed = res ? res.passed : null;
              const hasRun = res !== undefined;

              return (
                <React.Fragment key={item.id}>
                  <tr style={{ background: isPassed === true ? 'rgba(16, 185, 129, 0.03)' : isPassed === false ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>#{item.id}</td>
                    <td>
                      <span style={{ 
                        fontSize: '0.72rem', 
                        fontFamily: 'var(--font-mono)', 
                        background: 'rgba(255, 255, 255, 0.06)', 
                        padding: '0.15rem 0.4rem', 
                        borderRadius: '4px' 
                      }}>
                        {item.category}
                      </span>
                    </td>
                    <td>
                      <span className={`tenant-tag ${item.tenant_id === 'tenant_engineering' ? 'tenant-eng' : 'tenant-hr'}`} style={{ fontSize: '0.7rem' }}>
                        {item.tenant_id.replace('tenant_', '')}
                      </span>
                    </td>
                    <td style={{ maxWidth: '320px' }}>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>{item.question}</strong>
                    </td>
                    <td>
                      <span style={{ 
                        fontFamily: 'var(--font-mono)', 
                        fontSize: '0.75rem',
                        color: item.expected_behavior === 'decline' ? '#fbbf24' : '#60a5fa' 
                      }}>
                        {item.expected_behavior?.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {hasRun ? (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                          {res.actual_declined ? 'DECLINED 🛡️' : `ANSWERED (${res.citations_count} citations)`}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Pending</span>
                      )}
                    </td>
                    <td>
                      {hasRun ? (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: res.highest_score >= 0.35 ? 'var(--success)' : 'var(--text-muted)' }}>
                          {(res.highest_score * 100).toFixed(1)}%
                        </span>
                      ) : '-'}
                    </td>
                    <td>
                      {hasRun ? (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                          {res.latency_ms}ms
                        </span>
                      ) : '-'}
                    </td>
                    <td>
                      {hasRun ? (
                        isPassed ? (
                          <span className="pass-badge">PASS</span>
                        ) : (
                          <span className="fail-badge">FAIL</span>
                        )
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {hasRun && (
                        <button 
                          onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                          style={{ background: 'transparent', color: 'var(--text-secondary)', marginRight: '0.5rem', fontSize: '0.75rem' }}
                        >
                          {expandedId === item.id ? 'Hide' : 'Details'}
                        </button>
                      )}
                      <button 
                        className="action-btn"
                        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', fontSize: '0.72rem' }}
                        onClick={() => runSingleTest(item.id)}
                        disabled={running}
                      >
                        Run
                      </button>
                    </td>
                  </tr>

                  {/* Expandable Answer Row */}
                  {expandedId === item.id && res && (
                    <tr>
                      <td colSpan="10" style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '1rem 1.5rem' }}>
                        <div style={{ fontSize: '0.85rem' }}>
                          <strong style={{ color: 'var(--accent-primary)' }}>Assistant Output:</strong>
                          <p style={{ marginTop: '0.35rem', whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>
                            {res.answer}
                          </p>
                          {res.failure_reason && (
                            <p style={{ color: 'var(--danger)', marginTop: '0.5rem' }}>
                              ⚠️ Failure Note: {res.failure_reason}
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
