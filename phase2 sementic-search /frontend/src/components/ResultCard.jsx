import React, { useState } from 'react';
import { Copy, Check, Code, FileText, BookOpen, Layers } from 'lucide-react';

export default function ResultCard({ item, configColor = '#6366f1' }) {
  const [copied, setCopied] = useState(false);
  const [showJson, setShowJson] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(item.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isHighSim = item.similarity_percent >= 60;
  const simClass = isHighSim ? 'sim-high' : 'sim-medium';

  return (
    <div className="result-card">
      <div className="card-top-row">
        <div className="rank-source-group">
          <div className="rank-badge">#{item.rank}</div>
          
          <div className="source-badge">
            <FileText size={14} color="#94a3b8" />
            <span>{item.source_id}</span>
          </div>

          <span className="meta-pill">
            <Layers size={12} style={{ display: 'inline', marginRight: '4px' }} />
            {item.chunk_position}
          </span>

          {item.source_type === 'pdf' && (
            <span className="meta-pill" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
              <BookOpen size={12} style={{ display: 'inline', marginRight: '4px' }} />
              Page {item.page}
            </span>
          )}

          <span className="meta-pill">{item.category}</span>
        </div>

        <div className="scores-group">
          <div className={`similarity-badge ${simClass}`}>
            <span>{item.similarity_percent}% Match</span>
          </div>

          <div className="distance-badge" title="Cosine Distance = 1.0 - Cosine Similarity">
            Dist: {item.cosine_distance}
          </div>
        </div>
      </div>

      {/* Chunk Raw Text Snippet */}
      <div className="chunk-text-box">
        {item.text}
      </div>

      <div className="card-footer-row">
        <span>Length: {item.char_count} chars • Config: {item.config}</span>

        <div className="footer-actions">
          <button className="action-btn" onClick={handleCopy} title="Copy chunk snippet to clipboard">
            {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>

          <button
            className="action-btn"
            onClick={() => setShowJson(!showJson)}
            title="Inspect ChromaDB vector record & raw metadata"
          >
            <Code size={14} />
            <span>{showJson ? 'Hide Payload' : 'Inspect Record'}</span>
          </button>
        </div>
      </div>

      {showJson && (
        <div style={{ marginTop: '12px' }}>
          <div style={{ fontSize: '0.76rem', color: '#818cf8', marginBottom: '6px', fontFamily: 'var(--font-mono)' }}>
            ⚡ Vector Space: {item.vector_dim || 384}-dim • 8D Preview: [{item.embedding_preview?.join(', ')}]
          </div>
          <pre className="json-inspector">
            {JSON.stringify(
              {
                id: item.id,
                source_id: item.source_id,
                source_type: item.source_type,
                chunk_position: item.chunk_position,
                page: item.page,
                category: item.category,
                char_count: item.char_count,
                similarity_score: item.similarity_score,
                cosine_distance: item.cosine_distance,
                vector_dimensions: item.vector_dim || 384,
                embedding_preview_8d: item.embedding_preview || [],
                vector_space: "cosine"
              },
              null,
              2
            )}
          </pre>
        </div>
      )}
    </div>
  );
}
