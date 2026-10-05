const API_BASE = '/api';

export async function fetchStats() {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export async function fetchFilters() {
  const res = await fetch(`${API_BASE}/filters`);
  if (!res.ok) throw new Error('Failed to fetch metadata filters');
  return res.json();
}

export async function searchChunks({
  query,
  config_key = 'config_a',
  top_k = 5,
  source_filter = null,
  category_filter = null,
  min_score = 0
}) {
  const res = await fetch(`${API_BASE}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      config_key,
      top_k,
      source_filter: source_filter === 'all' ? null : source_filter,
      category_filter: category_filter === 'all' ? null : category_filter,
      min_score: parseFloat(min_score) || 0
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Search request failed');
  }
  return res.json();
}

export async function compareConfigs({
  query,
  top_k = 5,
  source_filter = null,
  category_filter = null
}) {
  const res = await fetch(`${API_BASE}/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      top_k,
      source_filter: source_filter === 'all' ? null : source_filter,
      category_filter: category_filter === 'all' ? null : category_filter
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Comparison request failed');
  }
  return res.json();
}

export async function fetchBenchmarkQueries() {
  const res = await fetch(`${API_BASE}/benchmark/queries`);
  if (!res.ok) throw new Error('Failed to fetch benchmark queries');
  return res.json();
}

export async function runBenchmarkEvaluation() {
  const res = await fetch(`${API_BASE}/benchmark/run`);
  if (!res.ok) throw new Error('Failed to execute benchmark evaluation');
  return res.json();
}

export async function fetchChunks({ config_key = 'config_a', page = 1, limit = 20, source = null }) {
  const params = new URLSearchParams({ config_key, page, limit });
  if (source && source !== 'all') params.append('source', source);
  const res = await fetch(`${API_BASE}/chunks?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch chunks');
  return res.json();
}

export async function uploadDocument(file, category) {
  const formData = new FormData();
  formData.append('file', file);
  if (category) formData.append('category', category);

  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Document upload failed');
  }
  return res.json();
}

export async function triggerReindexing(force_reindex = false) {
  const res = await fetch(`${API_BASE}/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ force_reindex })
  });
  if (!res.ok) throw new Error('Failed to trigger re-indexing');
  return res.json();
}
