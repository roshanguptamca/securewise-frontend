import { useState } from "react";
import { Outlet, useLocation, NavLink } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useAuth } from "../context/AuthContext";
import { LoadingState } from "./ui/States";

const LOGIN_URL =
  (import.meta.env.VITE_LOGIN_URL as string | undefined) ??
  "https://www.guidewisey.com/login";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/projects": "Projects",
  "/scans": "Scans",
  "/findings": "Findings",
  "/reports": "Reports",
  "/repositories": "Repositories",
  "/scan-policies": "Scan Policies",
  "/integrations": "Integrations",
  "/organizations": "Organizations",
  "/settings": "Settings",
};

const NAV_LINKS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/scans", label: "Scans" },
  { to: "/findings", label: "Findings" },
  { to: "/reports", label: "Reports" },
];

export default function Layout() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <LoadingState message="Loading SecureWise…" />
      </div>
    );
  }

  // Not authenticated — redirect to GuideWisey login
  if (!user) {
    const next = encodeURIComponent(window.location.href);
    window.location.href = `${LOGIN_URL}?next=${next}`;
    return null;
  }

  const pageTitle =
    Object.entries(PAGE_TITLES).find(([path]) =>
      location.pathname.startsWith(path),
    )?.[1] ?? "SecureWise";

  const initials = (user.first_name?.[0] ?? user.username[0]).toUpperCase();

  return (
    <div className="sw-layout">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 99,
          }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="sw-main">
        {/* Top bar */}
        <header className="sw-topbar">
          {/* Mobile menu toggle */}
          <button
            className="btn-icon"
            style={{ display: "none" }}
            id="mobile-menu-btn"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Open menu"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {/* Breadcrumb */}
          <span className="text-sm text-muted" style={{ fontWeight: 500 }}>
            <span className="gradient-text" style={{ fontWeight: 700 }}>
              SecureWise
            </span>{" "}
            / {pageTitle}
          </span>

          {/* Centre quick-nav links (hidden on mobile) */}
          <nav className="sw-topbar-nav">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `sw-topbar-nav-link${isActive ? " active" : ""}`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Right side */}
          <div
            className="flex items-center gap-3"
            style={{ position: "relative" }}
          >
            {/* GuideWisey home link */}
            <a
              href={import.meta.env.VITE_MAIN_URL ?? "https://guidewisey.com"}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-subtle"
              style={{ display: "flex", alignItems: "center", gap: 4 }}
              title="Back to GuideWisey"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              guidewisey.com
            </a>

            {/* User avatar + dropdown */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setUserMenuOpen((o) => !o)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg,#6366f1,#a855f7)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "#fff",
                  border: "2px solid rgba(99,102,241,0.4)",
                  cursor: "pointer",
                }}
                aria-label="User menu"
                title={user.username}
              >
                {initials}
              </button>

              {userMenuOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    style={{ position: "fixed", inset: 0, zIndex: 49 }}
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 8px)",
                      right: 0,
                      minWidth: 200,
                      background: "var(--bg-card, #1e1e2e)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 10,
                      boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                      zIndex: 50,
                      overflow: "hidden",
                    }}
                  >
                    {/* User info header */}
                    <div
                      style={{
                        padding: "12px 16px",
                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          color: "var(--text-primary, #fff)",
                        }}
                      >
                        {user.first_name
                          ? `${user.first_name} ${user.last_name}`.trim()
                          : user.username}
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted, #94a3b8)",
                          marginTop: 2,
                        }}
                      >
                        {user.email}
                      </div>
                    </div>

                    {/* Menu items */}
                    {[
                      { to: "/settings", label: "⚙️  Settings" },
                      { to: "/organizations", label: "🏢  Organizations" },
                      { to: "/integrations", label: "🔌  Integrations" },
                    ].map(({ to, label }) => (
                      <NavLink
                        key={to}
                        to={to}
                        onClick={() => setUserMenuOpen(false)}
                        style={{
                          display: "block",
                          padding: "9px 16px",
                          fontSize: "0.82rem",
                          color: "var(--text-secondary, #cbd5e1)",
                          textDecoration: "none",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) =>
                          ((e.currentTarget as HTMLElement).style.background =
                            "rgba(99,102,241,0.12)")
                        }
                        onMouseLeave={(e) =>
                          ((e.currentTarget as HTMLElement).style.background =
                            "transparent")
                        }
                      >
                        {label}
                      </NavLink>
                    ))}

                    <div
                      style={{
                        borderTop: "1px solid rgba(255,255,255,0.06)",
                        margin: "4px 0",
                      }}
                    />

                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout();
                      }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "9px 16px",
                        fontSize: "0.82rem",
                        color: "#f87171",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLElement).style.background =
                          "rgba(248,113,113,0.08)")
                      }
                      onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLElement).style.background =
                          "transparent")
                      }
                    >
                      🚪 Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="sw-page fade-up">
          <Outlet />
        </main>
      </div>

      {/* Mobile breakpoint styles */}
      <style>{`
        @media (max-width: 768px) {
          #mobile-menu-btn { display: flex !important; }
          .sw-topbar-nav { display: none !important; }
        }
      `}</style>
    </div>
  );
}
