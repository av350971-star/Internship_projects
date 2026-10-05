import React, { useState } from 'react';
import { Play, BarChart2, CheckCircle2, Award, Zap, BookOpen, HelpCircle, Sparkles, Check, X } from 'lucide-react';
import { runBenchmarkEvaluation } from '../services/api';

export default function BenchmarkTab({ benchmarkData, setBenchmarkData }) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  const handleRunBenchmark = async () => {
    setRunning(true);
    setError(null);
    try {
      const data = await runBenchmarkEvaluation();
      setBenchmarkData(data);
    } catch (err) {
      setError(err.message || 'Benchmark run failed');
    } finally {
      setRunning(false);
    }
  };

  const aggA = benchmarkData?.aggregate_metrics?.config_a;
  const aggB = benchmarkData?.aggregate_metrics?.config_b;

  return (
    <div>
      {/* Benchmark Action Hero */}
      <div className="benchmark-hero">
        <div className="benchmark-text">
          <h3>Hand-Written Query Benchmark (10 Queries)</h3>
          <p>
            Rigorous evaluation of retrieval accuracy against ground-truth source documents.
            Features 7 standard conceptual queries plus 3 paraphrased queries with minimal keyword overlap to verify semantic dense retrieval.
          </p>
        </div>

        <button
          className="btn-primary"
          onClick={handleRunBenchmark}
          disabled={running}
        >
          {running ? <div className="spinner" /> : <Play size={18} fill="white" />}
          <span>{running ? 'Running Evaluation...' : 'Run Automated Benchmark'}</span>
        </button>
      </div>

      {error && (
        <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '10px', marginBottom: '20px', color: '#fca5a5' }}>
          {error}
        </div>
      )}

      {benchmarkData && (
        <>
          {/* Winner Banner */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(99, 102, 241, 0.12))',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '12px',
              padding: '18px 20px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Award size={24} color="#10b981" />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
                  Benchmark Winner (By Ground-Truth Accuracy)
                </div>
                <div style={{ fontSize: '1.15rem', color: '#f8fafc', fontWeight: 700, marginTop: '2px' }}>
                  {benchmarkData.overall_winner}
                </div>
              </div>
            </div>

            <div style={{ maxWidth: '650px', fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5 }}>
              {benchmarkData.winner_reason}
            </div>
          </div>

          {/* Rule Note: Why Hit@3 and MRR, NOT raw similarity */}
          <div
            style={{
              background: 'rgba(30, 41, 59, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '20px',
              fontSize: '0.82rem',
              color: '#94a3b8',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start'
            }}
          >
            <HelpCircle size={16} color="#818cf8" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: '#e2e8f0' }}>Why Winner is determined by Hit@3 & MRR (NOT raw similarity %):</strong>{' '}
              Raw cosine similarity can be inflated by longer chunks or repetitive tokens without actually retrieving the correct information.
              Ground-truth retrieval accuracy evaluates whether the query actually finds the expected document (Hit@3) and how high it ranks (Mean Reciprocal Rank).
            </div>
          </div>

          {/* Aggregate Metrics Side-by-Side Cards */}
          <div className="metrics-comparison-cards">
            {/* Card A */}
            <div className="metric-card card-a">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h4 style={{ color: '#60a5fa', fontSize: '1.1rem' }}>{aggA?.name}</h4>
                <span className="meta-pill" style={{ color: '#60a5fa' }}>Avg Chunk: {aggA?.avg_chunk_length} chars</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc' }}>
                    {aggA?.hit_at_3_pct}%
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Hit@3 ({aggA?.hits_at_3_count}/10)</div>
                </div>

                <div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc' }}>
                    {aggA?.mrr}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>MRR Score</div>
                </div>

                <div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#94a3b8' }}>
                    {aggA?.hit_at_1_pct}%
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Hit@1 ({aggA?.hits_at_1_count}/10)</div>
                </div>
              </div>

              <div style={{ fontSize: '0.8rem', color: '#94a3b8', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Avg Top-1 Match: <strong style={{ color: '#f8fafc' }}>{aggA?.avg_top1_score}%</strong></span>
                <span>Target: High-precision facts</span>
              </div>
            </div>

            {/* Card B */}
            <div className="metric-card card-b">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h4 style={{ color: '#c084fc', fontSize: '1.1rem' }}>{aggB?.name}</h4>
                <span className="meta-pill" style={{ color: '#c084fc' }}>Avg Chunk: {aggB?.avg_chunk_length} chars</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc' }}>
                    {aggB?.hit_at_3_pct}%
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Hit@3 ({aggB?.hits_at_3_count}/10)</div>
                </div>

                <div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc' }}>
                    {aggB?.mrr}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>MRR Score</div>
                </div>

                <div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#94a3b8' }}>
                    {aggB?.hit_at_1_pct}%
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Hit@1 ({aggB?.hits_at_1_count}/10)</div>
                </div>
              </div>

              <div style={{ fontSize: '0.8rem', color: '#94a3b8', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Avg Top-1 Match: <strong style={{ color: '#f8fafc' }}>{aggB?.avg_top1_score}%</strong></span>
                <span>Target: Broad explanatory context</span>
              </div>
            </div>
          </div>

          {/* Dynamic Conclusion Box */}
          <div
            style={{
              background: 'rgba(30, 41, 59, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '18px 20px',
              marginBottom: '24px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Zap size={18} color="#f59e0b" />
              <strong style={{ fontSize: '0.95rem' }}>Dynamic Conclusion (Generated from Computed Benchmark Metrics)</strong>
            </div>
            <p style={{ fontSize: '0.88rem', color: '#cbd5e1', lineHeight: 1.6 }}>
              {benchmarkData.conclusion}
            </p>
          </div>

          {/* Detailed 10 Queries Evaluation Table */}
          <div className="benchmark-table-wrapper">
            <table className="benchmark-table">
              <thead>
                <tr>
                  <th style={{ width: '3%' }}>#</th>
                  <th style={{ width: '34%' }}>Query & Ground-Truth Sources</th>
                  <th style={{ width: '10%' }}>Type</th>
                  <th style={{ width: '23%' }}>Config A (Small 300ch)</th>
                  <th style={{ width: '23%' }}>Config B (Large 800ch)</th>
                  <th style={{ width: '7%' }}>Winner</th>
                </tr>
              </thead>
              <tbody>
                {benchmarkData.query_results?.map((qr, idx) => (
                  <tr key={qr.id}>
                    <td style={{ fontWeight: 600, color: '#64748b' }}>{idx + 1}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#f8fafc', marginBottom: '6px', fontSize: '0.88rem' }}>
                        {qr.query}
                      </div>
                      
                      <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, color: '#cbd5e1' }}>Expected: </span>
                        {qr.expected_sources?.join(', ')}
                      </div>

                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {qr.expected_topics?.map((topic, ti) => (
                          <span key={ti} className="meta-pill" style={{ fontSize: '0.68rem' }}>
                            {topic}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      {qr.is_paraphrased ? (
                        <span className="status-badge" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)', fontSize: '0.7rem' }}>
                          <Sparkles size={11} style={{ display: 'inline', marginRight: '3px' }} />
                          Paraphrased
                        </span>
                      ) : (
                        <span className="meta-pill" style={{ fontSize: '0.72rem' }}>
                          {qr.category}
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <strong style={{ color: '#60a5fa' }}>{qr.config_a.top_score}%</strong>
                        <span style={{ fontSize: '0.7rem', color: qr.config_a.hit3 ? '#10b981' : '#ef4444' }}>
                          {qr.config_a.hit3 ? '✓ Hit@3' : '✗ Miss'} (RR: {qr.config_a.rr})
                        </span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#cbd5e1', fontWeight: 500 }}>
                        {qr.config_a.sources?.[0]}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '2px', lineHeight: 1.3 }}>
                        "{qr.config_a.top_snippet}"
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <strong style={{ color: '#c084fc' }}>{qr.config_b.top_score}%</strong>
                        <span style={{ fontSize: '0.7rem', color: qr.config_b.hit3 ? '#10b981' : '#ef4444' }}>
                          {qr.config_b.hit3 ? '✓ Hit@3' : '✗ Miss'} (RR: {qr.config_b.rr})
                        </span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#cbd5e1', fontWeight: 500 }}>
                        {qr.config_b.sources?.[0]}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '2px', lineHeight: 1.3 }}>
                        "{qr.config_b.top_snippet}"
                      </div>
                    </td>
                    <td>
                      <span
                        className="status-badge"
                        style={{
                          background: qr.winner === 'Config A' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                          color: qr.winner === 'Config A' ? '#60a5fa' : '#c084fc',
                          border: `1px solid ${qr.winner === 'Config A' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(168, 85, 247, 0.3)'}`,
                          fontSize: '0.72rem'
                        }}
                      >
                        {qr.winner}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!benchmarkData && !running && (
        <div className="glass-card empty-state">
          <BarChart2 size={40} />
          <h3>10 Hand-Written Queries Ready to Benchmark</h3>
          <p style={{ marginTop: '8px', maxWidth: '540px', margin: '8px auto 0' }}>
            Click "Run Automated Benchmark" to evaluate retrieval accuracy (Hit@1, Hit@3, MRR) across Config A and Config B,
            including 3 paraphrased queries testing true semantic search.
          </p>
        </div>
      )}
    </div>
  );
}
