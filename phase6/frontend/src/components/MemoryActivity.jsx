import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Eye, 
  PlusCircle, 
  Edit, 
  Trash2, 
  RefreshCw, 
  Filter,
  Layers,
  Clock,
  Search
} from 'lucide-react';

export default function MemoryActivity() {
  const [logs, setLogs] = useState([]);
  const [memoriesMap, setMemoriesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [eventFilter, setEventFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (eventFilter !== 'all') params.append('event_type', eventFilter);
      params.append('limit', '80');

      const [auditRes, memRes] = await Promise.all([
        fetch(`/api/memory/audit?${params.toString()}`),
        fetch('/api/memory?status=all')
      ]);

      if (auditRes.ok) {
        const data = await auditRes.json();
        setLogs(data);
      }
      if (memRes.ok) {
        const memData = await memRes.json();
        const map = {};
        memData.forEach(m => { map[m.id] = m; });
        setMemoriesMap(map);
      }
    } catch (err) {
      console.error('Failed to fetch audit records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [eventFilter]);

  // In "All Events" view, suppress redundant preliminary 'retrieved' entries
  // when a corresponding 'injected' or 'rejected' decision already exists for that turn/query
  const displayLogs = React.useMemo(() => {
    let base = logs;
    if (eventFilter === 'all') {
      const decidedKeys = new Set();
      logs.forEach(l => {
        if ((l.event_type === 'injected' || l.event_type === 'rejected') && l.query && l.memory_id) {
          decidedKeys.add(`${l.session_id || ''}_${l.memory_id}_${l.query.trim().toLowerCase()}`);
        }
      });
      base = logs.filter(l => {
        if (l.event_type === 'retrieved' && l.query && l.memory_id) {
          const key = `${l.session_id || ''}_${l.memory_id}_${l.query.trim().toLowerCase()}`;
          if (decidedKeys.has(key)) return false;
        }
        return true;
      });
    }

    if (!searchQuery.trim()) return base;
    const q = searchQuery.toLowerCase();
    return base.filter(log => (
      log.memory_id.toLowerCase().includes(q) ||
      (log.query && log.query.toLowerCase().includes(q)) ||
      (log.reason && log.reason.toLowerCase().includes(q))
    ));
  }, [logs, eventFilter, searchQuery]);

  const renderEventIcon = (eventType, injected) => {
    switch (eventType) {
      case 'injected':
        return <CheckCircle2 className="text-emerald-400" size={18} />;
      case 'rejected':
        return <XCircle className="text-rose-400" size={18} />;
      case 'retrieved':
        return <Eye className="text-sky-400" size={18} />;
      case 'created':
        return <PlusCircle className="text-cyan-400" size={18} />;
      case 'updated':
        return <Edit className="text-indigo-400" size={18} />;
      case 'deleted':
        return <Trash2 className="text-red-400" size={18} />;
      default:
        return <Layers className="text-muted" size={18} />;
    }
  };

  const getEventBadgeClass = (eventType) => {
    switch (eventType) {
      case 'injected': return 'badge-injected';
      case 'rejected': return 'badge-rejected';
      case 'retrieved': return 'badge-retrieved';
      case 'created': return 'badge-created';
      case 'updated': return 'badge-updated';
      case 'deleted': return 'badge-deleted';
      default: return 'badge-default';
    }
  };

  return (
    <div className="view-container animate-fade">
      <div className="view-header">
        <div>
          <h2>Memory Activity & Audit Trail</h2>
          <p className="text-secondary text-sm">
            Immutable log tracking every memory retrieval, relevance evaluation, context injection, and lifecycle change.
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-outline" onClick={fetchLogs}>
            <RefreshCw size={15} />
            Refresh Audit
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="filter-bar glass-panel">
        <div className="search-box">
          <Search size={16} className="text-muted" />
          <input
            type="text"
            placeholder="Search audit by query, memory ID, or reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-pills">
          <button
            className={`pill-btn ${eventFilter === 'all' ? 'active' : ''}`}
            onClick={() => setEventFilter('all')}
          >
            All Events
          </button>
          <button
            className={`pill-btn pill-inj ${eventFilter === 'injected' ? 'active' : ''}`}
            onClick={() => setEventFilter('injected')}
          >
            ✓ Injected
          </button>
          <button
            className={`pill-btn pill-rej ${eventFilter === 'rejected' ? 'active' : ''}`}
            onClick={() => setEventFilter('rejected')}
          >
            ✗ Rejected
          </button>
          <button
            className={`pill-btn pill-ret ${eventFilter === 'retrieved' ? 'active' : ''}`}
            onClick={() => setEventFilter('retrieved')}
          >
            Retrieved
          </button>
          <button
            className={`pill-btn pill-crud ${eventFilter === 'created' ? 'active' : ''}`}
            onClick={() => setEventFilter('created')}
          >
            Created
          </button>
          <button
            className={`pill-btn pill-del ${eventFilter === 'deleted' ? 'active' : ''}`}
            onClick={() => setEventFilter('deleted')}
          >
            Deleted
          </button>
        </div>
      </div>

      {/* Audit Timeline */}
      {loading ? (
        <div className="empty-state glass-panel">
          <RefreshCw className="animate-spin text-muted" size={28} />
          <p>Loading audit ledger...</p>
        </div>
      ) : displayLogs.length === 0 ? (
        <div className="empty-state glass-panel">
          <Clock size={32} className="text-muted" />
          <h3>No audit events recorded</h3>
          <p className="text-secondary text-sm">
            Events will be logged as memories are retrieved, injected, or modified during chats.
          </p>
        </div>
      ) : (
        <div className="activity-timeline">
          {displayLogs.map((log) => {
            const timeStr = new Date(log.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            });
            const dateStr = new Date(log.timestamp).toLocaleDateString();

            return (
              <div key={log.audit_id} className="timeline-entry glass-panel">
                <div className="entry-header">
                  <div className="entry-icon-title">
                    {renderEventIcon(log.event_type, log.injected)}
                    <span className={`event-type-badge ${getEventBadgeClass(log.event_type)}`}>
                      {log.event_type.toUpperCase()}
                    </span>
                    <span className="mono-text text-xs text-muted">{log.memory_id}</span>
                  </div>

                  <div className="entry-meta">
                    {log.session_id && (
                      <span className="meta-pill mono-text text-xs">{log.session_id}</span>
                    )}
                    <span className="text-xs text-muted">{dateStr} {timeStr}</span>
                  </div>
                </div>

                {/* Evaluated Memory Information */}
                {memoriesMap[log.memory_id] && (
                  <div className="entry-memory-context mb-2">
                    <span className="text-xs text-muted">Evaluated Memory: </span>
                    <span className="text-xs font-semibold text-indigo-300">
                      "{memoriesMap[log.memory_id].content}"
                    </span>
                    <span className={`type-badge badge-${memoriesMap[log.memory_id].memory_type} ml-2 text-xs`}>
                      {memoriesMap[log.memory_id].memory_type.toUpperCase()}
                    </span>
                  </div>
                )}

                {log.query && (
                  <div className="entry-query">
                    <span className="text-xs text-muted">User Query:</span>
                    <p className="query-quote">"{log.query}"</p>
                  </div>
                )}

                {/* Score breakdown if available */}
                {(log.relevance_score !== null || log.confidence !== null) && (
                  <div className="entry-scores">
                    {log.relevance_score !== null && (
                      <div className="score-pill">
                        <span className="text-muted">Relevance:</span>
                        <span className="mono-text font-semibold">{log.relevance_score.toFixed(2)}</span>
                      </div>
                    )}
                    {log.confidence !== null && (
                      <div className="score-pill">
                        <span className="text-muted">Confidence:</span>
                        <span className="mono-text font-semibold">{log.confidence.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Decision / Status summary */}
                <div className="entry-decision">
                  {log.event_type === 'injected' ? (
                    <div className="decision-banner banner-injected">
                      <CheckCircle2 size={14} />
                      <span>✓ Injected into model context</span>
                    </div>
                  ) : log.event_type === 'rejected' ? (
                    <div className="decision-banner banner-rejected">
                      <XCircle size={14} />
                      <span>✗ Not injected — {log.reason || 'Failed thresholds'}</span>
                    </div>
                  ) : log.reason ? (
                    <div className="decision-banner banner-info">
                      <span>{log.reason}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
