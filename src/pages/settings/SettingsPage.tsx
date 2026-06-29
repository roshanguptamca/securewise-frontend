import { useAuth } from "../../context/AuthContext";

export default function SettingsPage() {
  const { user } = useAuth();
  const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

  return (
    <div>
      <div className="sw-page-header">
        <div>
          <h1 className="sw-page-title">Settings</h1>
          <p className="sw-page-subtitle">Account and portal configuration.</p>
        </div>
      </div>
      <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <h2
            style={{
              fontSize: "0.95rem",
              fontWeight: 700,
              marginBottom: "1rem",
            }}
          >
            Account
          </h2>
          <div className="flex-col gap-3">
            {[
              ["Username", user?.username],
              ["Email", user?.email],
              [
                "Name",
                `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() ||
                  "—",
              ],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between text-sm">
                <span className="text-subtle">{l}</span>
                <span style={{ color: "var(--gw-text-body)" }}>{v}</span>
              </div>
            ))}
          </div>
          <hr className="divider" />
          <a
            href={`${apiBase}/accounts/profile/`}
            className="btn-secondary"
            style={{ fontSize: "0.8rem" }}
          >
            Manage Account on GuideWisey →
          </a>
        </div>
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <h2
            style={{
              fontSize: "0.95rem",
              fontWeight: 700,
              marginBottom: "1rem",
            }}
          >
            Environment
          </h2>
          <div className="flex-col gap-2">
            {[
              ["API Base URL", apiBase],
              [
                "Portal URL",
                import.meta.env.VITE_SECUREWISE_FRONTEND_URL ??
                  window.location.origin,
              ],
            ].map(([l, v]) => (
              <div key={l}>
                <div className="text-xs text-subtle mb-1">{l}</div>
                <code style={{ fontSize: "0.72rem", color: "#86efac" }}>
                  {v}
                </code>
              </div>
            ))}
          </div>
        </div>
        <div
          className="glass-card"
          style={{ padding: "1.5rem", gridColumn: "1/-1" }}
        >
          <h2
            style={{
              fontSize: "0.95rem",
              fontWeight: 700,
              marginBottom: "0.5rem",
            }}
          >
            Authentication
          </h2>
          <p className="text-sm text-muted mb-4">
            SecureWise reuses GuideWisey authentication. Login, logout, and
            OAuth (Google/Microsoft Entra ID) are shared across the platform.
          </p>
          <div className="flex gap-3" style={{ flexWrap: "wrap" }}>
            <div className="alert alert-success" style={{ flex: 1 }}>
              <span>✅</span>
              <span className="text-xs">
                Session auth active (GuideWisey shared session)
              </span>
            </div>
            <div className="alert alert-info" style={{ flex: 1 }}>
              <span>🔜</span>
              <span className="text-xs">
                Google OAuth — reuse existing GuideWisey SSO
              </span>
            </div>
            <div className="alert alert-info" style={{ flex: 1 }}>
              <span>🔜</span>
              <span className="text-xs">Microsoft Entra ID — coming soon</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
