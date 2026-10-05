import React, { useState, useEffect } from 'react';

export default function DocumentManager({ currentTenant }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`/api/documents?tenant_id=${currentTenant}`);
      const data = await resp.json();
      setDocuments(data.documents || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [currentTenant]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('tenant_id', currentTenant);
    formData.append('force_reindex', 'true');

    setUploading(true);
    setStatusMsg({ type: 'info', text: `Ingesting & indexing ${file.name}...` });

    try {
      const resp = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData
      });
      const data = await resp.json();
      if (resp.ok) {
        setStatusMsg({
          type: 'success',
          text: `Success: ${data.message} (${data.chunk_count} chunks indexed)`
        });
        fetchDocs();
      } else {
        setStatusMsg({ type: 'danger', text: `Upload failed: ${data.detail || 'Unknown error'}` });
      }
    } catch (err) {
      setStatusMsg({ type: 'danger', text: `Upload error: ${err.message}` });
    } finally {
      setUploading(false);
    }
  };

  const handleReindex = async (docId, filename) => {
    setStatusMsg({ type: 'info', text: `Re-indexing ${filename}...` });
    try {
      const resp = await fetch(`/api/documents/reindex/${docId}`, { method: 'POST' });
      const data = await resp.json();
      if (resp.ok) {
        setStatusMsg({ type: 'success', text: `Re-indexed ${filename} (${data.chunk_count} chunks updated).` });
        fetchDocs();
      } else {
        setStatusMsg({ type: 'danger', text: `Re-index failed: ${data.detail}` });
      }
    } catch (err) {
      setStatusMsg({ type: 'danger', text: `Error: ${err.message}` });
    }
  };

  const handleDelete = async (docId, filename) => {
    if (!confirm(`Are you sure you want to delete ${filename} and its chunks?`)) return;

    try {
      const resp = await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
      if (resp.ok) {
        setStatusMsg({ type: 'success', text: `Deleted document ${filename}.` });
        fetchDocs();
      } else {
        setStatusMsg({ type: 'danger', text: `Delete failed.` });
      }
    } catch (err) {
      setStatusMsg({ type: 'danger', text: `Error: ${err.message}` });
    }
  };

  const handleReindexAll = async () => {
    setStatusMsg({ type: 'info', text: `Re-indexing all documents for ${currentTenant}...` });
    try {
      const resp = await fetch(`/api/documents/reindex-all?tenant_id=${currentTenant}`, { method: 'POST' });
      const data = await resp.json();
      if (resp.ok) {
        setStatusMsg({ type: 'success', text: `Batch re-indexed ${data.documents_reindexed} documents (${data.total_chunks} chunks updated).` });
        fetchDocs();
      } else {
        setStatusMsg({ type: 'danger', text: 'Batch re-indexing failed.' });
      }
    } catch (err) {
      setStatusMsg({ type: 'danger', text: `Error: ${err.message}` });
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="glass-panel" style={{ padding: '2rem' }}>
      <div className="doc-manager-header">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
            Document Ingestion & Multi-Tenant Knowledge Store
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Supports PDF, DOCX, TXT, Markdown, and JSON with automated chunking, hashing, and re-indexing.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button 
            className="action-btn reindex-btn"
            style={{ padding: '0.6rem 1.1rem', fontSize: '0.82rem' }}
            onClick={handleReindexAll}
            title="Re-parse and re-embed all documents in current tenant"
          >
            🔄 Re-index All Docs
          </button>

          <label 
            className="action-btn"
            style={{ 
              background: 'var(--accent-gradient)', 
              color: '#fff', 
              padding: '0.6rem 1.25rem', 
              fontSize: '0.85rem',
              cursor: uploading ? 'not-allowed' : 'pointer'
            }}
          >
            <input 
              type="file" 
              accept=".pdf,.docx,.doc,.txt,.md,.json,.png,.jpg,.jpeg,.webp" 
              style={{ display: 'none' }} 
              onChange={handleFileUpload}
              disabled={uploading}
            />
            {uploading ? 'Processing...' : '+ Ingest New Document'}
          </label>
        </div>
      </div>

      {statusMsg && (
        <div style={{
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          fontSize: '0.85rem',
          background: statusMsg.type === 'success' ? 'var(--success-bg)' : statusMsg.type === 'info' ? 'var(--info-bg)' : 'var(--danger-bg)',
          color: statusMsg.type === 'success' ? 'var(--success)' : statusMsg.type === 'info' ? 'var(--info)' : 'var(--danger)',
          border: `1px solid ${statusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : statusMsg.type === 'info' ? 'rgba(14, 165, 233, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
        }}>
          {statusMsg.text}
        </div>
      )}

      {/* Upload Drag & Drop Area */}
      <label className="upload-zone" style={{ display: 'block' }}>
        <input 
          type="file" 
          accept=".pdf,.docx,.doc,.txt,.md,.json,.png,.jpg,.jpeg,.webp" 
          style={{ display: 'none' }} 
          onChange={handleFileUpload}
          disabled={uploading}
        />
        <div className="upload-icon">📂</div>
        <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
          Click or Drop Multi-Format Files to Ingest into [{currentTenant}]
        </strong>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
          Accepted: PDF (with Auto-OCR fallback), DOCX, TXT, Markdown, JSON, Images (.png, .jpg) | Strict Tenant Isolation
        </p>
      </label>

      {/* Documents Table */}
      <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>Indexed Documents for Tenant ({documents.length})</span>
        <button 
          onClick={fetchDocs} 
          style={{ background: 'transparent', color: 'var(--text-muted)', fontSize: '0.8rem' }}
        >
          🔄 Refresh
        </button>
      </h3>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          Loading document registry...
        </div>
      ) : documents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
          No documents found for this tenant. Upload a file above to begin!
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="doc-table">
            <thead>
              <tr>
                <th>Document Name</th>
                <th>Format</th>
                <th>File Size</th>
                <th>Chunks</th>
                <th>SHA-256 Checksum</th>
                <th>Uploaded</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d.id}>
                  <td>
                    <strong style={{ color: 'var(--text-primary)' }}>{d.filename}</strong>
                  </td>
                  <td>
                    <span style={{ 
                      textTransform: 'uppercase', 
                      fontFamily: 'var(--font-mono)', 
                      fontSize: '0.72rem',
                      background: 'rgba(255, 255, 255, 0.08)',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px'
                    }}>
                      {d.file_type.replace('.', '')}
                    </span>
                  </td>
                  <td>{formatBytes(d.file_size)}</td>
                  <td>
                    <span style={{ 
                      fontFamily: 'var(--font-mono)', 
                      color: '#a5b4fc', 
                      fontWeight: 600 
                    }}>
                      {d.chunk_count} chunks
                    </span>
                  </td>
                  <td>
                    <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }} title={d.checksum}>
                      {d.checksum.slice(0, 10)}...
                    </code>
                  </td>
                  <td style={{ fontSize: '0.78rem' }}>
                    {new Date(d.uploaded_at).toLocaleDateString()}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      className="action-btn reindex-btn"
                      onClick={() => handleReindex(d.id, d.filename)}
                      title="Re-chunk and update embeddings without deleting"
                    >
                      🔄 Re-index
                    </button>
                    <button 
                      className="action-btn delete-btn"
                      onClick={() => handleDelete(d.id, d.filename)}
                      title="Permanently remove document and associated chunks"
                    >
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
