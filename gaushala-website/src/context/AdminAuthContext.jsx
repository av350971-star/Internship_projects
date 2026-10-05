import { createContext, useContext, useState } from "react";
import { DEMO_ADMIN_CREDENTIALS } from "../admin/authConfig.js";
import { loadFromStorage, saveToStorage } from "../utils/storage.js";

// -----------------------------------------------------------------------
// Frontend/demo-only authentication for the /admin panel.
//
// There is no backend yet, so "being logged in" is just a boolean flag
// mirrored to localStorage (via src/utils/storage.js), which is why it
// survives a page refresh but is not a real, server-verified session.
//
// FUTURE BACKEND INTEGRATION:
// Replace the credential check inside `login` with a real API call
// (e.g. `await api.login(email, password)` returning a token), store that
// token instead of the boolean flag below, and verify it server-side on
// every protected request. `ProtectedRoute` and every component that calls
// `useAdminAuth()` can stay exactly the same — only this file changes.
// -----------------------------------------------------------------------

const AdminAuthContext = createContext(null);

const SESSION_KEY = "adminSession";

export function AdminAuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() =>
    loadFromStorage(SESSION_KEY, false)
  );

  const login = (email, password) => {
    const normalizedEmail = (email || "").trim().toLowerCase();
    const isValid =
      (normalizedEmail === DEMO_ADMIN_CREDENTIALS.email.toLowerCase() ||
        normalizedEmail === "sarvahitamsevasamiti@gmail.com") &&
      password === DEMO_ADMIN_CREDENTIALS.password;

    if (isValid) {
      setIsAuthenticated(true);
      saveToStorage(SESSION_KEY, true);
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    saveToStorage(SESSION_KEY, false);
  };

  return (
    <AdminAuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error("useAdminAuth must be used inside <AdminAuthProvider>");
  }
  return ctx;
}
