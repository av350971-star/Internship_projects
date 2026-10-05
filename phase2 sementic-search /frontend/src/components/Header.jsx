import React from 'react';
import { Database, Search, Layers, BarChart3, HardDrive, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Header({ stats, activeTab, setActiveTab, backendOnline }) {
  const configA = stats?.configurations?.config_a;
  const configB = stats?.configurations?.config_b;

  return (
    <header className="header-container">
      <div className="header-top">
        <div className="brand-wrapper">
          <div className="brand-icon">
            <Search size={24} color="#ffffff" />
          </div>
          <div>
            <h1 className="brand-title">Semantic Search Engine</h1>
            <div className="brand-subtitle">
              <span>Pure Dense Retrieval Layer (Without Generative LLM)</span>
              <span>•</span>
              <span style={{ color: '#818cf8', fontWeight: 500 }}>Vector Similarity & Chunk Inspection</span>
            </div>
          </div>
        </div>

        <div className="status-badge status-online">
          {backendOnline ? (
            <>
              <div className="status-dot"></div>
              <span>FastAPI & ChromaDB Online</span>
            </>
          ) : (
            <>
              <AlertCircle size={14} color="#ef4444" />
              <span style={{ color: '#ef4444' }}>Backend Offline</span>
            </>
          )}
        </div>
      </div>

      {/* Stats Ribbon */}
      <div className="stats-ribbon">
        <div className="stat-item">
          <span className="stat-label">Ingested Corpus</span>
          <div className="stat-value">
            {stats?.total_documents || 21} <span className="stat-sub">Documents</span>
          </div>
        </div>

        <div className="stat-item">
          <span className="stat-label" style={{ color: '#60a5fa' }}>Config A (Small 300ch)</span>
          <div className="stat-value">
            {configA?.total_chunks_stored || 410} <span className="stat-sub">Chunks</span>
          </div>
        </div>

        <div className="stat-item">
          <span className="stat-label" style={{ color: '#c084fc' }}>Config B (Large 800ch)</span>
          <div className="stat-value">
            {configB?.total_chunks_stored || 172} <span className="stat-sub">Chunks</span>
          </div>
        </div>

        <div className="stat-item">
          <span className="stat-label">Dense Vector Space</span>
          <div className="stat-value">
            384 <span className="stat-sub">Dimensions (MiniLM)</span>
          </div>
        </div>

        <div className="stat-item">
          <span className="stat-label">Metric</span>
          <div className="stat-value">
            Cosine <span className="stat-sub">Distance Space</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="nav-tabs">
        <button
          className={`nav-tab ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          <Search size={17} />
          <span>Semantic Search & Inspector</span>
        </button>

        <button
          className={`nav-tab ${activeTab === 'compare' ? 'active' : ''}`}
          onClick={() => setActiveTab('compare')}
        >
          <Layers size={17} />
          <span>Chunking Comparison</span>
          <span className="tab-badge">Side-by-Side</span>
        </button>

        <button
          className={`nav-tab ${activeTab === 'benchmark' ? 'active' : ''}`}
          onClick={() => setActiveTab('benchmark')}
        >
          <BarChart3 size={17} />
          <span>Benchmark Query Set</span>
          <span className="tab-badge">Hand-Written</span>
        </button>

        <button
          className={`nav-tab ${activeTab === 'dataset' ? 'active' : ''}`}
          onClick={() => setActiveTab('dataset')}
        >
          <HardDrive size={17} />
          <span>Corpus & Chunks Explorer</span>
          <span className="tab-badge">{stats?.total_documents || 21} Docs</span>
        </button>
      </nav>
    </header>
  );
}
