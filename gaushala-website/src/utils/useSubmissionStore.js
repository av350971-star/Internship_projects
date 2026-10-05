import { useCallback } from "react";
import { loadFromStorage, saveToStorage, generateId } from "./storage.js";

// Small localStorage-backed list store for frontend-only public forms that
// don't need to be read back anywhere else in the app yet (Suggestions,
// Volunteer applications, Adoption/Sponsorship requests) — same demo
// persistence pattern as DataContext/ReportsContext, just without a full
// context+provider since nothing currently subscribes to these lists.
//
// FUTURE BACKEND INTEGRATION: replace the body of `add` with a POST to a
// real endpoint (e.g. `await api.post('/suggestions', entry)`); every
// caller (`useSubmissionStore("suggestions").add(...)`) stays the same.
export function useSubmissionStore(key) {
  const add = useCallback(
    (entry) => {
      const list = loadFromStorage(key, []);
      const record = {
        id: generateId(key),
        createdAt: new Date().toISOString(),
        ...entry,
      };
      saveToStorage(key, [record, ...list]);
      return record;
    },
    [key]
  );

  return { add };
}
