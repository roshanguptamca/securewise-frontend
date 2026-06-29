import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV = [
  {
    section: "Overview",
    items: [{ to: "/dashboard", label: "Dashboard", icon: GridIcon }],
  },
  {
    section: "Security",
    items: [
      { to: "/projects", label: "Projects", icon: FolderIcon },
      { to: "/scans", label: "Scans", icon: ScanIcon },
      { to: "/findings", label: "Findings", icon: BugIcon },
      { to: "/reports", label: "Reports", icon: FileIcon },
    ],
  },
  {
    section: "Configuration",
    items: [
      { to: "/repositories", label: "Repositories", icon: RepoIcon },
      { to: "/scan-policies", label: "Scan Policies", icon: PolicyIcon },
      { to: "/integrations", label: "Integrations", icon: PlugIcon },
    ],
  },
  {
    section: "Admin",
    items: [
      { to: "/organizations", label: "Organizations", icon: OrgIcon },
      { to: "/settings", label: "Settings", icon: SettingsIcon },
    ],
  },
];

export default function Sidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  const { user, logout } = useAuth();

  return (
    <aside className={`sw-sidebar${mobileOpen ? " open" : ""}`}>
      {/* Logo — links back to GuideWisey main site */}
      <a
        href="https://guidewisey.com"
        className="sw-sidebar-logo"
        target="_blank"
        rel="noreferrer"
        title="Back to GuideWisey"
      >
        <div className="sw-sidebar-logo-icon">🛡️</div>
        <div className="sw-sidebar-logo-text">
          <strong>SecureWise</strong>
          <span>by GuideWisey</span>
        </div>
      </a>

      {/* Nav */}
      <nav className="sw-sidebar-nav">
        {NAV.map((group) => (
          <div key={group.section}>
            <div className="sw-sidebar-section">{group.section}</div>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `sw-nav-item${isActive ? " active" : ""}`
                }
                onClick={onClose}
              >
                <item.icon />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer — user info + logout */}
      <div className="sw-sidebar-footer">
        {user && (
          <div
            className="flex items-center gap-3"
            style={{ marginBottom: "0.5rem" }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: "linear-gradient(135deg,#6366f1,#a855f7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "#fff",
                flexShrink: 0,
              }}
            >
              {(user.first_name?.[0] ?? user.username[0]).toUpperCase()}
            </div>
            <div style={{ overflow: "hidden", flex: 1 }}>
              <div
                className="text-sm font-semibold truncate"
                style={{ color: "var(--gw-text-body)" }}
              >
                {user.first_name
                  ? `${user.first_name} ${user.last_name}`.trim()
                  : user.username}
              </div>
              <div className="text-xs truncate text-subtle">{user.email}</div>
            </div>
          </div>
        )}
        <button
          className="sw-nav-item w-full"
          onClick={logout}
          style={{ color: "#fca5a5" }}
        >
          <LogoutIcon />
          Sign out
        </button>
      </div>
    </aside>
  );
}

// ── Inline SVG icons — consistent with gw-frontend Bootstrap Icons style ──

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function ScanIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
      <path d="M8 12h8M12 8v8" strokeLinecap="round" />
    </svg>
  );
}
function BugIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 2l1.88 1.88M14.12 3.88 16 2M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" />
      <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6z" />
      <path
        d="M12 20v-9M6.53 9C4.6 8.8 3 7.1 3 5M6 13H2M20 13h-4M20.47 9c1.93-.2 3.53-1.9 3.53-4M17 5s.853 2.512 0 6"
        strokeLinecap="round"
      />
    </svg>
  );
}
function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}
function RepoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}
function PolicyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function PlugIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22v-5M9 8V2M15 8V2M18 8H6a1 1 0 0 0-1 1v3a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4V9a1 1 0 0 0-1-1z" />
    </svg>
  );
}
function OrgIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
