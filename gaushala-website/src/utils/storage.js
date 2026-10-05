// Small localStorage wrapper used for every frontend-only demo persistence
// need across the app: DataContext (admin-managed content), ReportsContext
// (Gau Mata problem reports), and useSubmissionStore (Suggestions,
// Volunteer applications, Adoption/Sponsorship requests).
//
// NOTE FOR FUTURE BACKEND INTEGRATION:
// This is a frontend-only placeholder for persistence. When a real backend
// exists, replace the calls to `loadFromStorage` / `saveToStorage` in each
// of those files with API calls (fetch/axios), and this file can be
// deleted.

const NAMESPACE = "gaushala_admin";

export function loadFromStorage(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(`${NAMESPACE}:${key}`);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`[storage] Could not read "${key}", using fallback.`, error);
    return fallback;
  }
}

export function saveToStorage(key, value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${NAMESPACE}:${key}`, JSON.stringify(value));
  } catch (error) {
    console.warn(`[storage] Could not save "${key}".`, error);
  }
}

// Generates a reasonably unique id without extra dependencies.
// A real backend would issue proper ids on create.
export function generateId(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}
