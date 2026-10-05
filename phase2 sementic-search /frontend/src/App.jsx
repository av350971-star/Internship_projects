import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import SearchTab from './components/SearchTab';
import CompareTab from './components/CompareTab';
import BenchmarkTab from './components/BenchmarkTab';
import DatasetTab from './components/DatasetTab';
import {
  fetchStats,
  fetchFilters,
  searchChunks,
  compareConfigs,
  fetchBenchmarkQueries
} from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('search');
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({ sources: [], categories: [] });
  const [benchmarkQueries, setBenchmarkQueries] = useState([]);
  const [backendOnline, setBackendOnline] = useState(true);

  // Search Tab State
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);

  // Compare Tab State
  const [compareData, setCompareData] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState(null);

  // Benchmark Tab State
  const [benchmarkData, setBenchmarkData] = useState(null);

  const loadInitialData = async () => {
    try {
      const [sData, fData, qData] = await Promise.all([
        fetchStats(),
        fetchFilters(),
        fetchBenchmarkQueries()
      ]);
      setStats(sData);
      setFilters(fData);
      setBenchmarkQueries(qData);
      setBackendOnline(true);
    } catch (err) {
      console.error('Initialization error:', err);
      setBackendOnline(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleSearch = async (params) => {
    setSearchLoading(true);
    setSearchError(null);
    try {
      const data = await searchChunks(params);
      setSearchResults(data);
    } catch (err) {
      setSearchError(err.message || 'Search execution failed');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleCompare = async (params) => {
    setCompareLoading(true);
    setCompareError(null);
    try {
      const data = await compareConfigs(params);
      setCompareData(data);
    } catch (err) {
      setCompareError(err.message || 'Comparison execution failed');
    } finally {
      setCompareLoading(false);
    }
  };

  return (
    <div className="app-container">
      <Header
        stats={stats}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        backendOnline={backendOnline}
      />

      <main style={{ marginTop: '8px' }}>
        {activeTab === 'search' && (
          <SearchTab
            filters={filters}
            onSearch={handleSearch}
            searchResults={searchResults}
            loading={searchLoading}
            error={searchError}
          />
        )}

        {activeTab === 'compare' && (
          <CompareTab
            benchmarkQueries={benchmarkQueries}
            onCompare={handleCompare}
            compareData={compareData}
            loading={compareLoading}
            error={compareError}
          />
        )}

        {activeTab === 'benchmark' && (
          <BenchmarkTab
            benchmarkData={benchmarkData}
            setBenchmarkData={setBenchmarkData}
          />
        )}

        {activeTab === 'dataset' && (
          <DatasetTab
            stats={stats}
            filters={filters}
            onRefreshStats={loadInitialData}
          />
        )}
      </main>

      <footer style={{ marginTop: '50px', textAlign: 'center', fontSize: '0.8rem', color: '#64748b', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
        Semantic Search Retrieval Engine (Pure Vector Search) • Built with React, FastAPI, ChromaDB & SentenceTransformers
      </footer>
    </div>
  );
}
