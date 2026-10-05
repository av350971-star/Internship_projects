import React, { useState, useEffect } from 'react';
import { HardDrive, Upload, RefreshCw, FileText, CheckCircle2, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { fetchChunks, uploadDocument, triggerReindexing } from '../services/api';

export default function DatasetTab({ stats, filters, onRefreshStats }) {
  const [configKey, setConfigKey] = useState('config_a');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [chunksData, setChunksData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [uploadMsg, setUploadMsg] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  const loadChunks = async () => {
    setLoading(true);
    try {
      const data = await fetchChunks({
        config_key: configKey,
        page,
        limit: 10,
        source: sourceFilter
      });
      setChunksData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChunks();
  }, [configKey, sourceFilter, page]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadMsg(null);
    setUploadError(null);

    try {
      const res = await uploadDocument(file);
      setUploadMsg(`Successfully uploaded and indexed "${file.name}"!`);
      if (onRefreshStats) onRefreshStats();
      loadChunks();
    } catch (err) {
      setUploadError(err.message || 'File upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleReindex = async () => {
    if (!window.confirm("Re-index all documents? This will regenerate embeddings for both Config A and Config B.")) return;
    setReindexing(true);
    try {
      await triggerReindexing(true);
      if (onRefreshStats) onRefreshStats();
      loadChunks();
      alert("Re-indexing completed successfully!");
    } catch (err) {
      alert("Re-indexing error: " + err.message);
    } finally {
      setReindexing(false);
    }
  };

  return (
    <div>
      {/* Overview Cards */}
      <div className="glass-card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '6px' }}>
              Corpus & Vector Index Verification
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              Requirement check: Ingest at least 20 documents or 200+ meaningful chunks with source ID, chunk position, and metadata.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              className="action-btn"
              style={{ padding: '8px 14px' }}
              onClick={handleReindex}
              disabled={reindexing}
            >
              <RefreshCw size={14} className={reindexing ? 'spinner' : ''} />
              <span>{reindexing ? 'Indexing...' : 'Re-index Database'}</span>
            </button>

            <label className="btn-primary" style={{ cursor: 'pointer', padding: '8px 16px', fontSize: '0.85rem' }}>
              <Upload size={14} />
              <span>{uploading ? 'Uploading...' : 'Upload PDF/TXT'}</span>
              <input
                type="file"
                accept=".pdf,.txt,.md"
                onChange={handleFileUpload}
                disabled={uploading}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>

        {uploadMsg && (
          <div style={{ marginTop: '14px', padding: '10px 14px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', borderRadius: '8px', color: '#6ee7b7', fontSize: '0.85rem' }}>
            {uploadMsg}
          </div>
        )}

        {uploadError && (
          <div style={{ marginTop: '14px', padding: '10px 14px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '8px', color: '#fca5a5', fontSize: '0.85rem' }}>
            {uploadError}
          </div>
        )}
      </div>

      {/* Explorer Controls */}
      <div className="glass-card" style={{ marginBottom: '20px', padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>Inspect Config:</span>
            <div className="config-selector">
              <button
                type="button"
                className={`config-btn ${configKey === 'config_a' ? 'active config-a' : ''}`}
                onClick={() => { setConfigKey('config_a'); setPage(1); }}
              >
                Config A (300ch) • 410 Chunks
              </button>
              <button
                type="button"
                className={`config-btn ${configKey === 'config_b' ? 'active config-b' : ''}`}
                onClick={() => { setConfigKey('config_b'); setPage(1); }}
              >
                Config B (800ch) • 172 Chunks
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>Filter Source:</span>
            <select
              className="filter-select"
              value={sourceFilter}
              onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
            >
              <option value="all">All Sources ({filters?.sources?.length || 0})</option>
              {filters?.sources?.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Chunks Table */}
      <div className="dataset-table-wrapper">
        <table className="benchmark-table">
          <thead>
            <tr>
              <th style={{ width: '22%' }}>Source ID & Position</th>
              <th style={{ width: '12%' }}>Category</th>
              <th style={{ width: '56%' }}>Chunk Text Content</th>
              <th style={{ width: '10%' }}>Chars</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '40px' }}>
                  <div className="spinner" style={{ margin: '0 auto 10px' }} />
                  <span>Loading chunks from ChromaDB...</span>
                </td>
              </tr>
            ) : chunksData?.chunks?.length > 0 ? (
              chunksData.chunks.map((chk) => (
                <tr key={chk.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.85rem' }}>
                      {chk.source_id}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                      <span className="meta-pill" style={{ fontSize: '0.7rem' }}>
                        {chk.chunk_position}
                      </span>
                      {chk.page > 0 && (
                        <span className="meta-pill" style={{ fontSize: '0.7rem' }}>
                          Page {chk.page}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="meta-pill">{chk.category}</span>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.84rem', color: '#cbd5e1', lineHeight: 1.5, maxHeight: '110px', overflowY: 'auto' }}>
                      {chk.text}
                    </div>
                    {chk.embedding_preview && chk.embedding_preview.length > 0 && (
                      <div style={{ marginTop: '6px', fontSize: '0.72rem', color: '#818cf8', fontFamily: 'var(--font-mono)' }}>
                        Vector (384-dim, 8D preview): [{chk.embedding_preview.join(', ')}]
                      </div>
                    )}
                  </td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#94a3b8' }}>
                      {chk.char_count}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  No chunks found matching current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '0 4px' }}>
        <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
          Showing page {page} of approx {Math.ceil((chunksData?.total_chunks || 410) / 10)}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="action-btn"
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            <ChevronLeft size={16} />
            <span>Prev</span>
          </button>
          <button
            className="action-btn"
            onClick={() => setPage(p => p + 1)}
          >
            <span>Next</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
