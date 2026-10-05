import React from 'react';

export default function CitationModal({ citation, onClose }) {
  if (!citation) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">✕</button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <span className="citation-badge" style={{ fontSize: '0.9rem', padding: '0.2rem 0.6rem' }}>
            [{citation.citation_index}]
          </span>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Source Chunk Verification</h2>
        </div>

        <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', fontSize: '0.82rem' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Document: </span>
              <strong style={{ color: 'var(--text-primary)' }}>{citation.doc_filename}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Page / Section: </span>
              <strong style={{ color: 'var(--text-primary)' }}>Page {citation.page_number} {citation.section_title ? `(${citation.section_title})` : ''}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Chunk ID: </span>
              <code style={{ fontFamily: 'var(--font-mono)', color: '#a5b4fc' }}>{citation.chunk_id}</code>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Relevance Score: </span>
              <strong style={{ color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
                {typeof citation.score === 'number' ? (citation.score * 100).toFixed(1) + '%' : citation.score}
              </strong>
            </div>
          </div>
        </div>

        <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
          Verified Text Excerpt
        </h3>
        <div style={{
          background: 'var(--bg-secondary)',
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.9rem',
          lineHeight: '1.6',
          borderLeft: '4px solid var(--accent-primary)',
          color: 'var(--text-primary)',
          maxHeight: '350px',
          overflowY: 'auto'
        }}>
          {citation.snippet}
        </div>

        <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
          <button 
            style={{
              background: 'var(--accent-gradient)',
              color: '#fff',
              padding: '0.5rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              fontSize: '0.85rem'
            }}
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
