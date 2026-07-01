import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../api/client";

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/accounts/me/")
      .then((r) => setUser(r.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const logout = async () => {
    try {
      // Reuse the existing GuideWisey-shared logout endpoint (same session/cookie auth
      // used by /accounts/me/) so the session is actually invalidated server-side, not
      // just forgotten client-side.
      await api.post("/accounts/logout/");
    } catch (err) {
      // Logout must never get stuck on a failed API call — still clear local state and
      // redirect home, but log safely (no PII/tokens) so failures are visible in devtools.
      console.error(
        "SecureWise logout API call failed; clearing local session anyway.",
        err,
      );
    } finally {
      setUser(null);
      // Defensively clear any client-side auth/session state. SecureWise itself does not
      // currently store tokens in localStorage/sessionStorage (auth is cookie-based), but
      // clearing both guards against stale state from other features and future changes.
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {
        // Storage access can throw in locked-down/private browsing contexts — ignore.
      }
      // Logging out must leave SecureWise entirely and land on the GuideWisey
      // homepage — never an internal SecureWise route (there is no "logged out"
      // dashboard state, and a full-page load of a client-only route without a
      // matching static asset/rewrite would otherwise 404).
      const homeUrl =
        import.meta.env.VITE_GUIDEWISE_HOME_URL ??
        (import.meta.env.DEV
          ? "http://localhost:3000/"
          : "https://www.guidewisey.com/");
      window.location.href = homeUrl;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
