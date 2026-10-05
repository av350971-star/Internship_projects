import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Database, 
  Terminal, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Layers, 
  Activity,
  RefreshCw,
  Gauge
} from 'lucide-react';

export default function MemoryDebug({ lastChatData, sessionId }) {
  const [sessionState, setSessionState] = useState(null);
  const [memories, setMemories] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDebugInfo = async () => {
    try {
      setLoading(true);
      // 1. Session state
      const sessUrl = sessionId ? `/api/session/current?session_id=${sessionId}` : '/api/session/current';
      const sessRes = await fetch(sessUrl);
      if (sessRes.ok) {
        const sessData = await sessRes.json();
        setSessionState(sessData);
      }

      // 2. All stored memories
      const memRes = await fetch('/api/memory?status=all');
      if (memRes.ok) {
        const memData = await memRes.json();
        setMemories(memData);
      }

      // 3. Recent audit logs to inspect recent retrieval decisions
      const auditRes = await fetch('/api/memory/audit?limit=20');
      if (auditRes.ok) {
        const auditData = await auditRes.json();
        setAuditLogs(auditData);
      }
    } catch (err) {
      console.error('Debug fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebugInfo();
  }, [lastChatData, sessionId]);

  const activeMemories = memories.filter(m => m.status === 'active');
  const deletedMemories = memories.filter(m => m.status === 'deleted');

  // Estimate context budget from last chat or default
  const budgetLimit = 1200;
  const injectedSummaries = lastChatData?.memory_context || [];
  const charsUsed = injectedSummaries.reduce((acc, m) => acc + m.content.length + 30, 0);
  const budgetPercentage = Math.min(100, Math.round((charsUsed / budgetLimit) * 100));

  // Build candidate decision breakdown from recent audit logs for the current turn/query
  const recentRetrievals = auditLogs.filter(l => l.event_type === 'retrieved' || l.event_type === 'rejected' || l.event_type === 'injected');
  const queryGrouped = {};
  recentRetrievals.forEach(log => {
    if (!log.memory_id) return;
    if (!queryGrouped[log.memory_id]) {
      queryGrouped[log.memory_id] = {
        memory_id: log.memory_id,
        query: log.query,
        relevance: log.relevance_score,
        confidence: log.confidence,
        injected: false,
        reason: log.reason,
        timestamp: log.timestamp
      };
    }
    if (log.event_type === 'injected') {
      queryGrouped[log.memory_id].injected = true;
    } else if (log.event_type === 'rejected') {
      queryGrouped[log.memory_id].injected = false;
      queryGrouped[log.memory_id].reason = log.reason;
    }
  });

  const evaluatedCandidates = Object.values(queryGrouped).slice(0, 8);

  return (
    <div className="view-container animate-fade">
      <div className="view-header">
        <div>
          <h2>Memory Debug & Telemetry</h2>
          <p className="text-secondary text-sm">
            Live diagnostic view of short-term session state, long-term memory health, and retrieval filtering decisions.
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-outline" onClick={fetchDebugInfo}>
            <RefreshCw size={15} />
            Refresh Telemetry
          </button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="debug-stats-grid">
        {/* Session Card */}
        <div className="debug-card glass-panel">
          <div className="debug-card-header">
            <Terminal size={18} className="text-indigo-400" />
            <h3>Current Session</h3>
          </div>
          <div className="debug-card-body">
            <div className="metric-row">
              <span className="text-muted">Session ID:</span>
              <span className="mono-text text-sm font-semibold">{sessionState?.session_id || 'None'}</span>
            </div>
            <div className="metric-row">
              <span className="text-muted">Current Task:</span>
              <span className="task-badge">{sessionState?.current_task || 'general_conversation'}</span>
            </div>
            <div className="metric-row">
              <span className="text-muted">Messages in Session:</span>
              <span className="mono-text">{sessionState?.messages?.length || 0}</span>
            </div>
            <div className="metric-row">
              <span className="text-muted">Temporary State:</span>
              <span className="mono-text text-xs">{JSON.stringify(sessionState?.temporary_state || {})}</span>
            </div>
          </div>
        </div>

        {/* Long-Term Memory Stats */}
        <div className="debug-card glass-panel">
          <div className="debug-card-header">
            <Database size={18} className="text-cyan-400" />
            <h3>Long-Term Memory</h3>
          </div>
          <div className="debug-card-body">
            <div className="metric-row">
              <span className="text-muted">Total Stored:</span>
              <span className="mono-text font-semibold">{memories.length}</span>
            </div>
            <div className="metric-row">
              <span className="text-muted">Active (Eligible):</span>
              <span className="mono-text text-emerald-400 font-semibold">{activeMemories.length}</span>
            </div>
            <div className="metric-row">
              <span className="text-muted">Soft-Deleted:</span>
              <span className="mono-text text-rose-400 font-semibold">{deletedMemories.length}</span>
            </div>
            <div className="metric-row">
              <span className="text-muted">Last Query Stats:</span>
              <span className="text-xs text-secondary">
                {lastChatData ? (
                  `Retrieved: ${lastChatData.memory.retrieved} | Eligible: ${lastChatData.memory.eligible} | Injected: ${lastChatData.memory.injected}`
                ) : 'No chat turn executed yet'}
              </span>
            </div>
          </div>
        </div>

        {/* Context Budget Gauge */}
        <div className="debug-card glass-panel">
          <div className="debug-card-header">
            <Gauge size={18} className="text-amber-400" />
            <h3>Memory Context Budget</h3>
          </div>
          <div className="debug-card-body">
            <div className="metric-row">
              <span className="text-muted">Budget Cap:</span>
              <span className="mono-text font-semibold">{budgetLimit} chars</span>
            </div>
            <div className="metric-row">
              <span className="text-muted">Used in Last Context:</span>
              <span className="mono-text font-semibold">{charsUsed} chars</span>
            </div>
            <div className="meter-item mt-2">
              <div className="meter-label">
                <span className="text-xs text-muted">Budget Consumption</span>
                <span className="mono-text text-xs">{budgetPercentage}%</span>
              </div>
              <div className="meter-track">
                <div 
                  className="meter-fill fill-budget" 
                  style={{ width: `${budgetPercentage}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-muted mt-2">
              Guardrail prevents prompt bloat by capping long-term memories at 1200 characters and 5 items.
            </p>
          </div>
        </div>
      </div>

      {/* Memory Decision Breakdown Table */}
      <div className="debug-section glass-panel mt-6">
        <div className="section-title-bar">
          <Activity size={18} className="text-indigo-400" />
          <h3>Recent Memory Evaluation Decisions</h3>
          <span className="text-xs text-muted">Dual-Gate Filtering (Relevance ≥ 0.60 & Confidence ≥ 0.70)</span>
        </div>

        {evaluatedCandidates.length === 0 ? (
          <div className="empty-state">
            <p className="text-secondary text-sm">No memory evaluations recorded yet. Run a chat query to see live scoring.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="debug-table">
              <thead>
                <tr>
                  <th>Memory ID</th>
                  <th>Category</th>
                  <th>Relevance</th>
                  <th>Confidence</th>
                  <th>Decision</th>
                  <th>Reason / Status</th>
                </tr>
              </thead>
              <tbody>
                {evaluatedCandidates.map((c) => {
                  const matchingMem = memories.find(m => m.id === c.memory_id);
                  const memType = matchingMem?.memory_type || 'unknown';
                  return (
                    <tr key={c.memory_id}>
                      <td className="mono-text text-sm font-semibold">{c.memory_id}</td>
                      <td>
                        <span className={`type-badge badge-${memType}`}>
                          {memType.toUpperCase()}
                        </span>
                      </td>
                      <td className="mono-text">{c.relevance !== null ? c.relevance.toFixed(2) : '-'}</td>
                      <td className="mono-text">{c.confidence !== null ? c.confidence.toFixed(2) : '-'}</td>
                      <td>
                        {c.injected ? (
                          <span className="decision-pill pill-pass">
                            <CheckCircle2 size={13} /> ✓ Injected
                          </span>
                        ) : (
                          <span className="decision-pill pill-fail">
                            <XCircle size={13} /> ✗ Rejected
                          </span>
                        )}
                      </td>
                      <td className="text-xs text-secondary">
                        {c.injected ? 'Passed all gates and budgeted' : c.reason || 'Below relevance threshold'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Architectural Safety Guarantees */}
      <div className="debug-section glass-panel mt-6">
        <div className="section-title-bar">
          <ShieldAlert size={18} className="text-emerald-400" />
          <h3>Controlled Memory Architecture Guarantees</h3>
        </div>
        <div className="guarantees-grid">
          <div className="guarantee-item">
            <span className="guarantee-title">1. No Blind Injection</span>
            <p className="text-xs text-secondary">Stored memories are NEVER passed unconditionally into model context.</p>
          </div>
          <div className="guarantee-item">
            <span className="guarantee-title">2. Physical Storage Separation</span>
            <p className="text-xs text-secondary">Ephemeral sessions (`data/sessions.db`) are partitioned away from memory (`data/memory.db`).</p>
          </div>
          <div className="guarantee-item">
            <span className="guarantee-title">3. Session Reset Safety</span>
            <p className="text-xs text-secondary">Session resets wipe conversation turns without erasing curated long-term memories.</p>
          </div>
          <div className="guarantee-item">
            <span className="guarantee-title">4. Soft Delete Integrity</span>
            <p className="text-xs text-secondary">Deleted memories are barred from retrieval while preserving audit compliance.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
