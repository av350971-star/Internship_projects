import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Tag, 
  ShieldCheck, 
  Clock, 
  BarChart2, 
  Search,
  Filter,
  RefreshCw,
  Info
} from 'lucide-react';
import MemoryEditor from './MemoryEditor';

export default function MemoryList({ onMemoryChanged }) {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingMemory, setEditingMemory] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  const fetchMemories = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (categoryFilter !== 'all') params.append('memory_type', categoryFilter);

      const res = await fetch(`/api/memory?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setMemories(data);
      }
    } catch (err) {
      console.error('Failed to fetch memories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, [categoryFilter, statusFilter]);

  const handleSave = async (formData) => {
    try {
      if (editingMemory) {
        // Update
        const res = await fetch(`/api/memory/${editingMemory.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (res.ok) {
          setEditingMemory(null);
          fetchMemories();
          if (onMemoryChanged) onMemoryChanged();
        }
      } else {
        // Create
        const res = await fetch('/api/memory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (res.ok) {
          setIsCreating(false);
          fetchMemories();
          if (onMemoryChanged) onMemoryChanged();
        }
      }
    } catch (err) {
      console.error('Error saving memory:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to soft delete this memory? It will no longer be injected into future model context.')) {
      return;
    }
    try {
      const res = await fetch(`/api/memory/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchMemories();
        if (onMemoryChanged) onMemoryChanged();
      }
    } catch (err) {
      console.error('Error deleting memory:', err);
    }
  };

  const filteredMemories = memories.filter(m => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return m.content.toLowerCase().includes(q) || m.id.toLowerCase().includes(q);
  });

  return (
    <div className="view-container animate-fade">
      {/* Top Controls Bar */}
      <div className="view-header">
        <div>
          <h2>My Memories</h2>
          <p className="text-secondary text-sm">
            Controlled long-term memory store. Active memories are evaluated per query and only injected when verified.
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-outline" onClick={fetchMemories} title="Refresh memories">
            <RefreshCw size={15} />
            Refresh
          </button>
          <button className="btn btn-primary" onClick={() => setIsCreating(true)}>
            <Plus size={16} />
            Add Memory
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar glass-panel">
        <div className="search-box">
          <Search size={16} className="text-muted" />
          <input
            type="text"
            placeholder="Search memories by content or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-pills">
          <button
            className={`pill-btn ${categoryFilter === 'all' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('all')}
          >
            All Types
          </button>
          <button
            className={`pill-btn pill-pref ${categoryFilter === 'preference' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('preference')}
          >
            Preference
          </button>
          <button
            className={`pill-btn pill-sem ${categoryFilter === 'semantic' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('semantic')}
          >
            Semantic
          </button>
          <button
            className={`pill-btn pill-epi ${categoryFilter === 'episodic' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('episodic')}
          >
            Episodic
          </button>
          <button
            className={`pill-btn pill-proc ${categoryFilter === 'procedural' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('procedural')}
          >
            Procedural
          </button>
        </div>

        <div className="status-selector">
          <span className="text-xs text-muted">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-select-sm"
          >
            <option value="active">Active Only</option>
            <option value="deleted">Soft Deleted Only</option>
            <option value="all">All Records</option>
          </select>
        </div>
      </div>

      {/* Memories Grid */}
      {loading ? (
        <div className="empty-state glass-panel">
          <RefreshCw className="animate-spin text-muted" size={28} />
          <p>Loading memory repository...</p>
        </div>
      ) : filteredMemories.length === 0 ? (
        <div className="empty-state glass-panel">
          <Info size={32} className="text-muted" />
          <h3>No memories found</h3>
          <p className="text-secondary text-sm">
            {searchQuery
              ? 'No memories match your search filter.'
              : statusFilter === 'deleted'
              ? 'No soft-deleted memories.'
              : 'Create a memory above or talk to the assistant with "Remember that I prefer..."'}
          </p>
        </div>
      ) : (
        <div className="memories-grid">
          {filteredMemories.map((mem) => {
            const isPref = mem.memory_type === 'preference';
            const isSem = mem.memory_type === 'semantic';
            const isEpi = mem.memory_type === 'episodic';
            const isDeleted = mem.status === 'deleted';

            return (
              <div 
                key={mem.id} 
                className={`memory-card glass-panel ${isDeleted ? 'card-deleted' : ''}`}
              >
                <div className="card-top">
                  <div className="card-badge-row">
                    <span className={`type-badge badge-${mem.memory_type}`}>
                      {mem.memory_type.toUpperCase()}
                    </span>
                    <span className="mono-text text-xs text-muted">{mem.id}</span>
                    {isDeleted && <span className="status-badge badge-deleted">DELETED</span>}
                  </div>

                  <div className="card-actions">
                    <button 
                      className="btn-icon" 
                      onClick={() => setEditingMemory(mem)}
                      title="Edit memory"
                    >
                      <Edit3 size={15} />
                    </button>
                    {!isDeleted && (
                      <button 
                        className="btn-icon text-danger" 
                        onClick={() => handleDelete(mem.id)}
                        title="Soft delete memory"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="card-content">
                  <p>{mem.content}</p>
                </div>

                {/* Meters */}
                <div className="card-meters">
                  <div className="meter-item">
                    <div className="meter-label">
                      <span>Confidence</span>
                      <span className="mono-text">{(mem.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <div className="meter-track">
                      <div 
                        className="meter-fill fill-confidence" 
                        style={{ width: `${mem.confidence * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="meter-item">
                    <div className="meter-label">
                      <span>Importance</span>
                      <span className="mono-text">{(mem.importance * 100).toFixed(0)}%</span>
                    </div>
                    <div className="meter-track">
                      <div 
                        className="meter-fill fill-importance" 
                        style={{ width: `${mem.importance * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer details */}
                <div className="card-footer">
                  <span className="meta-tag" title="Origin of this memory">
                    <ShieldCheck size={12} /> {mem.source}
                  </span>
                  <span className="meta-tag" title="Number of times retrieved">
                    <BarChart2 size={12} /> {mem.retrieval_count} uses
                  </span>
                  <span className="meta-tag" title="Last updated timestamp">
                    <Clock size={12} /> {new Date(mem.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Editor Modal */}
      {(isCreating || editingMemory) && (
        <MemoryEditor
          memory={editingMemory}
          onClose={() => {
            setIsCreating(false);
            setEditingMemory(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
