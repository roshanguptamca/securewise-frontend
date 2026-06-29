import { useEffect, useState } from "react";
import { sw } from "../../api/client";
import type { GitIntegration, Organization } from "../../types";
import { GitStatusBadge } from "../../components/ui/Badges";
import {
  LoadingState,
  EmptyState,
  ErrorState,
} from "../../components/ui/States";
import { Modal } from "../../components/ui/Modal";

const PROVIDER_ICONS: Record<string, string> = {
  github: "🐱",
  gitlab: "🦊",
  bitbucket: "🪣",
  azure_devops: "☁️",
};

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<GitIntegration[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showConnect, setShowConnect] = useState<
    "github" | "gitlab" | "bitbucket" | null
  >(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<
    Record<string, { ok: boolean; msg: string }>
  >({});

  const load = () => {
    setLoading(true);
    Promise.all([sw.gitIntegrations.list(), sw.orgs.list()])
      .then(([i, o]) => {
        setIntegrations(i.data.results ?? i.data);
        setOrgs(o.data.results ?? o.data);
      })
      .catch(() => setError("Failed to load integrations."))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);

  const handleTest = async (id: string) => {
    setTesting(id);
    try {
      await sw.gitIntegrations.test(id);
      setTestResult((r) => ({
        ...r,
        [id]: { ok: true, msg: "Connection successful!" },
      }));
    } catch (e: any) {
      setTestResult((r) => ({
        ...r,
        [id]: {
          ok: false,
          msg: e.response?.data?.detail ?? "Connection failed.",
        },
      }));
    } finally {
      setTesting(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this Git integration?")) return;
    await sw.gitIntegrations.delete(id);
    load();
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <div className="sw-page-header">
        <div>
          <h1 className="sw-page-title">Integrations</h1>
          <p className="sw-page-subtitle">
            Connect Git providers to enable private repository scanning.
          </p>
        </div>
      </div>

      {/* Provider connect buttons */}
      <div className="glass-card mb-6" style={{ padding: "1.5rem" }}>
        <h2
          style={{
            fontSize: "0.95rem",
            fontWeight: 700,
            marginBottom: "0.25rem",
          }}
        >
          Git Providers
        </h2>
        <p className="text-sm text-muted mb-4">
          Connect once. SecureWise will use your token for private repo access
          only — read-only.
        </p>
        <div className="flex gap-3" style={{ flexWrap: "wrap" }}>
          {(["github", "gitlab", "bitbucket"] as const).map((p) => (
            <button
              key={p}
              className="btn-secondary"
              onClick={() => setShowConnect(p)}
            >
              {PROVIDER_ICONS[p]} Connect{" "}
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Connected integrations */}
      <h2
        style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.75rem" }}
      >
        Connected Providers
      </h2>
      {integrations.length === 0 ? (
        <EmptyState
          title="No integrations yet"
          description="Connect a Git provider above to scan private repositories."
        />
      ) : (
        <div className="grid grid-3 gap-4">
          {integrations.map((i) => {
            const result = testResult[i.id];
            return (
              <div
                key={i.id}
                className="glass-card"
                style={{ padding: "1.25rem" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: "1.3rem" }}>
                      {PROVIDER_ICONS[i.provider] ?? "🔗"}
                    </span>
                    <div>
                      <div
                        className="text-sm font-semibold"
                        style={{ color: "var(--gw-text-primary)" }}
                      >
                        {i.name}
                      </div>
                      <div className="text-xs text-subtle">
                        {orgs.find((o) => o.id === i.organization)?.name}
                      </div>
                    </div>
                  </div>
                  <GitStatusBadge value={i.status} />
                </div>

                <div className="flex-col gap-1 mb-4">
                  <div className="flex justify-between text-xs">
                    <span className="text-subtle">Provider</span>
                    <span className={`provider-badge provider-${i.provider}`}>
                      {i.provider}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-subtle">Auth</span>
                    <span style={{ color: "var(--gw-text-muted)" }}>
                      {i.auth_type.replace(/_/g, " ")}
                    </span>
                  </div>
                  {i.token_last_four && (
                    <div className="flex justify-between text-xs">
                      <span className="text-subtle">Token</span>
                      <span style={{ color: "var(--gw-text-muted)" }}>
                        ••••{i.token_last_four}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs">
                    <span className="text-subtle">Connected</span>
                    <span style={{ color: "var(--gw-text-muted)" }}>
                      {new Date(i.connected_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {result && (
                  <div
                    className={`alert ${result.ok ? "alert-success" : "alert-error"} mb-3`}
                    style={{ padding: "0.4rem 0.75rem", fontSize: "0.72rem" }}
                  >
                    {result.msg}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    className="btn-secondary"
                    style={{ flex: 1, fontSize: "0.78rem" }}
                    disabled={testing === i.id}
                    onClick={() => handleTest(i.id)}
                  >
                    {testing === i.id ? "…" : "Test"}
                  </button>
                  <button
                    className="btn-icon"
                    title="Delete"
                    onClick={() => handleDelete(i.id)}
                    style={{ color: "#fca5a5" }}
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4h6v2" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Connect modal */}
      {showConnect && (
        <ConnectGitModal
          provider={showConnect}
          orgs={orgs}
          onClose={() => setShowConnect(null)}
          onCreated={() => {
            setShowConnect(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function ConnectGitModal({
  provider,
  orgs,
  onClose,
  onCreated,
}: {
  provider: "github" | "gitlab" | "bitbucket";
  orgs: Organization[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    organization: orgs[0]?.id ?? "",
    name: `My ${provider.charAt(0).toUpperCase() + provider.slice(1)}`,
    access_token: "",
    base_url:
      provider === "github"
        ? "https://github.com"
        : provider === "gitlab"
          ? "https://gitlab.com"
          : "https://bitbucket.org",
    auth_type: "personal_access_token",
    provider,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const SCOPES: Record<string, { classic: string; fine: string }> = {
    github: {
      classic: "public_repo (public) or repo read (private)",
      fine: "Contents: Read-only, Metadata: Read-only",
    },
    gitlab: { classic: "read_repository", fine: "Repository: Read-only" },
    bitbucket: { classic: "Repositories: Read", fine: "N/A" },
  };
  const scope = SCOPES[provider];

  const submit = async () => {
    if (!form.access_token) return setErr("Token is required.");
    if (!form.organization) return setErr("Organization is required.");
    setSaving(true);
    try {
      await sw.gitIntegrations.create(form);
      onCreated();
    } catch (e: any) {
      setErr(
        e.response?.data?.detail ??
          JSON.stringify(e.response?.data) ??
          "Failed to connect.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`Connect ${provider.charAt(0).toUpperCase() + provider.slice(1)}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={submit} disabled={saving}>
            {saving ? "Connecting…" : "Save Integration"}
          </button>
        </>
      }
    >
      {err && <div className="alert alert-error mb-4">{err}</div>}

      <div className="alert alert-info mb-4">
        <span>🔒</span>
        <span className="text-xs">
          SecureWise needs <strong>read-only</strong> repository access to clone
          and scan your code. We never write to your repository unless you later
          enable auto-fix PR creation.
        </span>
      </div>

      <div className="flex-col gap-4">
        <div className="form-group">
          <label className="form-label">Organization *</label>
          <select
            className="form-select"
            value={form.organization}
            onChange={(e) => set("organization", e.target.value)}
          >
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Integration Name</label>
          <input
            className="form-input"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Personal Access Token *</label>
          <input
            className="form-input"
            type="password"
            value={form.access_token}
            onChange={(e) => set("access_token", e.target.value)}
            placeholder={
              provider === "github" ? "ghp_xxxxxxxxxxxx" : "glpat-xxxxxxxxxxxx"
            }
            autoComplete="new-password"
          />
          <div className="hint-text mt-1">
            Required scopes — Classic: <code>{scope.classic}</code> ·
            Fine-grained: <code>{scope.fine}</code>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Base URL</label>
          <input
            className="form-input"
            value={form.base_url}
            onChange={(e) => set("base_url", e.target.value)}
          />
          <div className="hint-text mt-1">
            Change only for self-hosted {provider} instances.
          </div>
        </div>
      </div>
    </Modal>
  );
}
