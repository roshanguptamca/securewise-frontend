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
      await api.post("/accounts/logout/");
    } catch {
      // Ignore failures here — we still want to clear local state and leave
      // SecureWise even if the server-side logout call itself failed.
    } finally {
      setUser(null);
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
