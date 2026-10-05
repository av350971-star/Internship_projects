import React, { useState } from 'react';
import { Search, SlidersHorizontal, Sparkles, Filter, AlertTriangle } from 'lucide-react';
import ResultCard from './ResultCard';

const SAMPLE_QUERIES = [
  "What is classification in machine learning?",
  "How does backpropagation calculate gradients?",
  "Difference between precision and recall",
  "How does the attention mechanism work in Transformers?",
  "What is the kernel trick in SVM?",
  "How does logistic regression use the sigmoid function?"
];

export default function SearchTab({
  filters,
  onSearch,
  searchResults,
  loading,
  error
}) {
  const [query, setQuery] = useState('');
  const [configKey, setConfigKey] = useState('config_a');
  const [topK, setTopK] = useState(5);
  const [sourceFilter, setSourceFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [minScore, setMinScore] = useState(0);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    onSearch({
      query,
      config_key: configKey,
      top_k: topK,
      source_filter: sourceFilter,
      category_filter: categoryFilter,
      min_score: minScore
    });
  };

  const handleChipClick = (sampleQuery) => {
    setQuery(sampleQuery);
    onSearch({
      query: sampleQuery,
      config_key: configKey,
      top_k: topK,
      source_filter: sourceFilter,
      category_filter: categoryFilter,
      min_score: minScore
    });
  };

  return (
    <div>
      {/* Search Input and Controls */}
      <div className="glass-card search-controls-box">
        <form onSubmit={handleSubmit} className="search-input-wrapper">
          <Search className="search-icon-left" size={20} />
          <input
            type="text"
            className="main-search-input"
            placeholder="Type your natural language query (e.g. 'How does backpropagation calculate gradients?')..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className="search-submit-btn" disabled={loading || !query.trim()}>
            {loading ? <div className="spinner" /> : <Search size={16} />}
            <span>Search</span>
          </button>
        </form>

        {/* Quick Query Suggestions */}
        <div className="quick-queries-row">
          <span className="quick-label">
            <Sparkles size={13} style={{ display: 'inline', marginRight: '4px' }} />
            Try query:
          </span>
          {SAMPLE_QUERIES.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              className="query-chip"
              onClick={() => handleChipClick(sample)}
            >
              {sample}
            </button>
          ))}
        </div>

        {/* Filters and Parameter Controls */}
        <div className="filter-row">
          {/* Chunking Configuration Toggle */}
          <div className="filter-group">
            <label>Chunking Strategy</label>
            <div className="config-selector">
              <button
                type="button"
                className={`config-btn ${configKey === 'config_a' ? 'active config-a' : ''}`}
                onClick={() => setConfigKey('config_a')}
              >
                Config A (300ch)
              </button>
              <button
                type="button"
                className={`config-btn ${configKey === 'config_b' ? 'active config-b' : ''}`}
                onClick={() => setConfigKey('config_b')}
              >
                Config B (800ch)
              </button>
            </div>
          </div>

          {/* Top-K Results */}
          <div className="filter-group">
            <label>
              <span>Top-K Results:</span>
              <strong style={{ color: '#818cf8' }}>{topK}</strong>
            </label>
            <div className="slider-container">
              <input
                type="range"
                className="range-slider"
                min="1"
                max="15"
                value={topK}
                onChange={(e) => setTopK(parseInt(e.target.value))}
              />
            </div>
          </div>

          {/* Source Document Filter */}
          <div className="filter-group">
            <label>Source Document Filter</label>
            <select
              className="filter-select"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
            >
              <option value="all">All Documents ({filters?.sources?.length || 0})</option>
              {filters?.sources?.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="filter-group">
            <label>Category Filter</label>
            <select
              className="filter-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories ({filters?.categories?.length || 0})</option>
              {filters?.categories?.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Min Similarity Score Slider */}
          <div className="filter-group">
            <label>
              <span>Min Similarity:</span>
              <strong style={{ color: '#10b981' }}>{minScore}%</strong>
            </label>
            <div className="slider-container">
              <input
                type="range"
                className="range-slider"
                min="0"
                max="80"
                step="5"
                value={minScore}
                onChange={(e) => setMinScore(parseInt(e.target.value))}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '10px', marginBottom: '20px', color: '#fca5a5', display: 'flex', gap: '10px' }}>
          <AlertTriangle size={20} color="#ef4444" />
          <span>{error}</span>
        </div>
      )}

      {/* Search Results Display */}
      {searchResults ? (
        <div>
          <div className="results-header-bar">
            <div className="results-count-title">
              <span>Retrieved Chunks ({searchResults.total_results})</span>
              <span className="meta-pill" style={{ color: configKey === 'config_a' ? '#60a5fa' : '#c084fc' }}>
                {searchResults.config_info?.name}
              </span>
            </div>

            <div className="latency-tag">
              Retrieval Latency: <strong>{searchResults.latency_ms} ms</strong>
            </div>
          </div>

          {searchResults.results && searchResults.results.length > 0 ? (
            <div className="results-list">
              {searchResults.results.map((item) => (
                <ResultCard
                  key={item.id}
                  item={item}
                  configColor={configKey === 'config_a' ? '#3b82f6' : '#a855f7'}
                />
              ))}
            </div>
          ) : (
            <div className="glass-card empty-state">
              <p>No chunks matched your filters or minimum similarity threshold.</p>
              <p style={{ fontSize: '0.8rem', marginTop: '6px', color: '#64748b' }}>
                Try reducing the minimum similarity score or switching to 'All Documents'.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="glass-card empty-state">
          <Search size={40} />
          <h3>Ready for Retrieval Inspection</h3>
          <p style={{ marginTop: '8px', maxWidth: '500px', margin: '8px auto 0' }}>
            Enter a query above or click any sample topic to inspect vector similarity,
            distances, and ranked text chunks.
          </p>
        </div>
      )}
    </div>
  );
}
