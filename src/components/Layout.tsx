import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useAuth } from "../context/AuthContext";
import { LoadingState } from "./ui/States";

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

export default function Layout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const pageTitle =
    Object.entries(PAGE_TITLES).find(([path]) =>
      location.pathname.startsWith(path),
    )?.[1] ?? "SecureWise";

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

          <span className="text-sm text-muted" style={{ fontWeight: 500 }}>
            <span className="gradient-text" style={{ fontWeight: 700 }}>
              SecureWise
            </span>{" "}
            / {pageTitle}
          </span>

          {/* Right side user pill */}
          {user && (
            <div className="flex items-center gap-3">
              {/* Link back to GuideWisey — keeps brand connection */}
              <a
                href="https://guidewisey.com"
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

              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg,#6366f1,#a855f7)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                {(user.first_name?.[0] ?? user.username[0]).toUpperCase()}
              </div>
            </div>
          )}
        </header>

        {/* Page content */}
        <main className="sw-page fade-up">
          <Outlet />
        </main>
      </div>

      {/* Show mobile menu button via CSS media query trick */}
      <style>{`
        @media (max-width: 768px) {
          #mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
