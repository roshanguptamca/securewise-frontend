import { useEffect, useState } from "react";
import { sw } from "../../api/client";
import type {
  Repository,
  Organization,
  Project,
  GitIntegration,
  GitHubAppInstallation,
  GitHubAppRepository,
} from "../../types";
import {
  LoadingState,
  EmptyState,
  ErrorState,
} from "../../components/ui/States";
import { Modal } from "../../components/ui/Modal";

export default function RepositoriesPage() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [integrations, setIntegrations] = useState<GitIntegration[]>([]);
  const [appInstallations, setAppInstallations] = useState<
    GitHubAppInstallation[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<
    Record<string, { ok: boolean; msg: string }>
  >({});

  const load = () => {
    setLoading(true);
    Promise.all([
      sw.repos.list(),
      sw.orgs.list(),
      sw.projects.list(),
      sw.gitIntegrations.list(),
      sw.githubApp.installations(),
    ])
      .then(([r, o, p, i, a]) => {
        setRepos(r.data.results ?? r.data);
        setOrgs(o.data.results ?? o.data);
        setProjects(p.data.results ?? p.data);
        setIntegrations(i.data.results ?? i.data);
        setAppInstallations(a.data.results ?? a.data);
      })
      .catch(() => setError("Failed to load repositories."))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);

  const handleTestAccess = async (id: string) => {
    setTesting(id);
    try {
      const r = await sw.repos.testAccess(id);
      setTestResults((t) => ({
        ...t,
        [id]: { ok: r.data.accessible, msg: r.data.message },
      }));
    } catch {
      setTestResults((t) => ({
        ...t,
        [id]: { ok: false, msg: "Test failed." },
      }));
    } finally {
      setTesting(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this repository?")) return;
    await sw.repos.delete(id);
    load();
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <div className="sw-page-header">
        <div>
          <h1 className="sw-page-title">Repositories</h1>
          <p className="sw-page-subtitle">
            {repos.length} repositor{repos.length !== 1 ? "ies" : "y"}{" "}
            registered.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          + Add Repository
        </button>
      </div>

      <GitHubAppPanel
        orgs={orgs}
        projects={projects}
        installations={appInstallations}
        onSynced={load}
      />

      {repos.length === 0 ? (
        <EmptyState
          title="No repositories yet"
          description="Add a repository to start scanning."
          action={
            <button className="btn-primary" onClick={() => setShowAdd(true)}>
              Add Repository
            </button>
          }
        />
      ) : (
        <div className="glass-card" style={{ overflow: "hidden" }}>
          <table className="sw-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Provider</th>
                <th>Access</th>
                <th>Visibility</th>
                <th>Branch</th>
                <th>Last Check</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {repos.map((r) => {
                const result = testResults[r.id];
                return (
                  <tr key={r.id}>
                    <td>
                      <div
                        className="text-sm font-semibold"
                        style={{ color: "var(--gw-text-primary)" }}
                      >
                        {r.name}
                      </div>
                      {r.access_mode === "local_path" ? (
                        <div
                          className="text-xs text-subtle truncate"
                          style={{ maxWidth: 220 }}
                          title={r.local_path}
                        >
                          {r.local_path}
                        </div>
                      ) : (
                        <a
                          href={r.repository_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-subtle truncate"
                          style={{ display: "block", maxWidth: 220 }}
                        >
                          {r.repository_url}
                        </a>
                      )}
                    </td>
                    <td>
                      {r.provider ? (
                        <span
                          className={`provider-badge provider-${r.provider}`}
                        >
                          {r.provider}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <span
                        className={`badge ${r.access_mode === "public" ? "badge-public" : "badge-private"}`}
                      >
                        {r.access_mode === "local_path"
                          ? "local path"
                          : r.access_mode}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${r.visibility === "public" ? "badge-public" : "badge-private"}`}
                      >
                        {r.visibility}
                      </span>
                    </td>
                    <td className="text-muted text-xs">{r.default_branch}</td>
                    <td>
                      {r.last_access_status && (
                        <span
                          className={`badge ${r.last_access_status === "accessible" ? "badge-completed" : "badge-failed"}`}
                        >
                          {r.last_access_status}
                        </span>
                      )}
                      {result && (
                        <span
                          className={`badge ${result.ok ? "badge-completed" : "badge-failed"} ml-1`}
                          title={result.msg}
                        >
                          {result.ok ? "✓" : "✗"}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          className="btn-icon"
                          title="Test access"
                          disabled={testing === r.id}
                          onClick={() => handleTestAccess(r.id)}
                        >
                          {testing === r.id ? (
                            <span className="spinner spinner-sm" />
                          ) : (
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                              <polyline points="22 4 12 14.01 9 11.01" />
                            </svg>
                          )}
                        </button>
                        <button
                          className="btn-icon"
                          style={{ color: "#fca5a5" }}
                          onClick={() => handleDelete(r.id)}
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
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AddRepositoryModal
          orgs={orgs}
          projects={projects}
          integrations={integrations}
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function GitHubAppPanel({
  orgs,
  projects,
  installations,
  onSynced,
}: {
  orgs: Organization[];
  projects: Project[];
  installations: GitHubAppInstallation[];
  onSynced: () => void;
}) {
  const [organization, setOrganization] = useState("");
  const [installation, setInstallation] = useState("");
  const [project, setProject] = useState("");
  const [available, setAvailable] = useState<GitHubAppRepository[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!organization && orgs.length) setOrganization(orgs[0].id);
  }, [organization, orgs]);

  const orgInstallations = installations.filter(
    (item) => item.organization === organization && item.available,
  );
  const orgProjects = projects.filter(
    (item) => item.organization === organization,
  );

  const connect = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await sw.githubApp.connect(organization);
      window.location.assign(response.data.installation_url);
    } catch (e: any) {
      setError(
        e.response?.data?.detail ?? "GitHub App connection could not start.",
      );
      setBusy(false);
    }
  };

  const loadAvailable = async () => {
    setBusy(true);
    setError("");
    setSelected([]);
    try {
      const response = await sw.githubApp.repositories(installation);
      setAvailable(response.data);
    } catch (e: any) {
      setError(
        e.response?.data?.detail ?? "Could not load installed repositories.",
      );
    } finally {
      setBusy(false);
    }
  };

  const syncSelected = async () => {
    setBusy(true);
    setError("");
    try {
      await sw.githubApp.selectRepositories({
        installation,
        repository_ids: selected,
        project: project || undefined,
      });
      setAvailable([]);
      setSelected([]);
      onSynced();
    } catch (e: any) {
      setError(
        e.response?.data?.detail ?? "Could not sync selected repositories.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="glass-card mb-4" style={{ padding: "1.25rem" }}>
      <h2 className="text-sm font-semibold mb-2">GitHub App</h2>
      <p className="text-xs text-muted mb-4">
        Connect SecureWise with read-only repository access. Scans use a pinned
        commit snapshot and never run repository build or install scripts.
      </p>
      {error && <div className="alert alert-error mb-3">{error}</div>}
      <div className="flex gap-2 items-end">
        <label className="form-group" style={{ minWidth: 220, flex: 1 }}>
          <span className="form-label">Organization</span>
          <select
            className="form-select"
            value={organization}
            onChange={(event) => {
              setOrganization(event.target.value);
              setInstallation("");
              setProject("");
              setAvailable([]);
              setSelected([]);
            }}
          >
            {orgs.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <button
          className="btn-secondary"
          onClick={connect}
          disabled={busy || !organization}
        >
          Connect GitHub App
        </button>
      </div>
      {orgInstallations.length > 0 && (
        <div className="flex gap-2 items-end mt-3">
          <label className="form-group" style={{ minWidth: 220, flex: 1 }}>
            <span className="form-label">Connected GitHub account</span>
            <select
              className="form-select"
              value={installation}
              onChange={(event) => {
                setInstallation(event.target.value);
                setAvailable([]);
              }}
            >
              <option value="">Select installation</option>
              {orgInstallations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.account_login}
                </option>
              ))}
            </select>
          </label>
          <button
            className="btn-secondary"
            onClick={loadAvailable}
            disabled={busy || !installation}
          >
            Load repositories
          </button>
        </div>
      )}
      {available.length > 0 && (
        <div className="mt-3">
          <label className="form-group">
            <span className="form-label">Project (optional)</span>
            <select
              className="form-select"
              value={project}
              onChange={(event) => setProject(event.target.value)}
            >
              <option value="">No project</option>
              {orgProjects.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <div
            className="flex-col gap-2 mt-3"
            style={{ maxHeight: 220, overflowY: "auto" }}
          >
            {available.map((repo) => (
              <label key={repo.id} className="text-xs flex gap-2 items-center">
                <input
                  type="checkbox"
                  checked={selected.includes(repo.id)}
                  onChange={(event) =>
                    setSelected((current) =>
                      event.target.checked
                        ? [...current, repo.id]
                        : current.filter((id) => id !== repo.id),
                    )
                  }
                />
                <span>{repo.full_name}</span>
                {repo.private && (
                  <span className="badge badge-private">private</span>
                )}
              </label>
            ))}
          </div>
          <button
            className="btn-primary mt-3"
            onClick={syncSelected}
            disabled={busy || selected.length === 0}
          >
            {busy ? "Syncing…" : `Add ${selected.length} selected`}
          </button>
        </div>
      )}
    </section>
  );
}

function AddRepositoryModal({
  orgs,
  projects,
  integrations,
  onClose,
  onCreated,
}: {
  orgs: Organization[];
  projects: Project[];
  integrations: GitIntegration[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    organization: orgs[0]?.id ?? "",
    project: "",
    name: "",
    repository_url: "",
    local_path: "",
    access_mode: "public",
    integration: "",
    default_branch: "main",
    visibility: "public",
  });
  const [validating, setValidating] = useState(false);
  const [validateResult, setValidateResult] = useState<{
    accessible: boolean;
    message: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setValidateResult(null);
  };

  const handleValidate = async () => {
    if (form.access_mode === "local_path" && !form.local_path) return;
    if (form.access_mode !== "local_path" && !form.repository_url) return;
    setValidating(true);
    setValidateResult(null);
    try {
      const r = await sw.repos.validate({
        repository_url: form.repository_url,
        local_path: form.local_path,
        access_mode: form.access_mode,
        integration_id: form.integration || undefined,
      });
      setValidateResult(r.data);
      if (!form.name) {
        if (form.access_mode === "local_path") {
          const parts = form.local_path.replace(/\/$/, "").split("/");
          set("name", parts[parts.length - 1] || "local-repository");
        } else if (r.data.provider) {
          const parts = form.repository_url.replace(/\.git$/, "").split("/");
          set("name", parts[parts.length - 1] || form.repository_url);
        }
      }
    } catch (e: any) {
      setValidateResult({
        accessible: false,
        message: e.response?.data?.message ?? "Validation failed.",
      });
    } finally {
      setValidating(false);
    }
  };

  const submit = async () => {
    if (!form.organization) return setErr("Organization is required.");
    if (form.access_mode === "local_path" && !form.local_path) {
      return setErr("Local path is required.");
    }
    if (form.access_mode !== "local_path" && !form.repository_url) {
      return setErr("Repository URL is required.");
    }
    setSaving(true);
    try {
      await sw.repos.create({
        ...form,
        repository_url:
          form.access_mode === "local_path" ? undefined : form.repository_url,
        integration:
          form.access_mode === "integration" && form.integration
            ? form.integration
            : undefined,
        project: form.project || undefined,
      });
      onCreated();
    } catch (e: any) {
      setErr(
        e.response?.data?.repository_url?.[0] ??
          e.response?.data?.local_path?.[0] ??
          e.response?.data?.local_path ??
          e.response?.data?.detail ??
          "Failed to add repository.",
      );
    } finally {
      setSaving(false);
    }
  };

  const orgIntegrations = integrations.filter(
    (i) => i.organization === form.organization && i.status === "active",
  );

  return (
    <Modal
      title="Add Repository"
      onClose={onClose}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={submit} disabled={saving}>
            {saving ? "Adding…" : "Add Repository"}
          </button>
        </>
      }
    >
      {err && <div className="alert alert-error mb-4">{err}</div>}
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
          <label className="form-label">Project (optional)</label>
          <select
            className="form-select"
            value={form.project}
            onChange={(e) => set("project", e.target.value)}
          >
            <option value="">— None —</option>
            {projects
              .filter((p) => p.organization === form.organization)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">
            {form.access_mode === "local_path"
              ? "Local Repository Path *"
              : "Repository URL *"}
          </label>
          <div className="flex gap-2">
            <input
              className="form-input"
              value={
                form.access_mode === "local_path"
                  ? form.local_path
                  : form.repository_url
              }
              onChange={(e) =>
                set(
                  form.access_mode === "local_path"
                    ? "local_path"
                    : "repository_url",
                  e.target.value,
                )
              }
              placeholder={
                form.access_mode === "local_path"
                  ? "/Users/you/projects/my-app"
                  : "https://github.com/org/repo"
              }
              style={{ flex: 1 }}
            />
            <button
              className="btn-secondary"
              onClick={handleValidate}
              disabled={
                validating ||
                (form.access_mode === "local_path"
                  ? !form.local_path
                  : !form.repository_url)
              }
            >
              {validating ? "…" : "Validate"}
            </button>
          </div>
          {validateResult && (
            <div
              className={`alert ${validateResult.accessible ? "alert-success" : "alert-error"} mt-2`}
              style={{ padding: "0.4rem 0.75rem" }}
            >
              <span className="text-xs">{validateResult.message}</span>
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Access Type</label>
          <select
            className="form-select"
            value={form.access_mode}
            onChange={(e) => set("access_mode", e.target.value)}
          >
            <option value="public">Public repository</option>
            <option value="integration">Use connected Git provider</option>
            <option value="local_path">Local path on this machine</option>
          </select>
          {form.access_mode === "local_path" && (
            <p className="text-xs text-muted" style={{ marginTop: 4 }}>
              The path must be readable by the SecureWise backend process. In
              local development this is usually your machine; in production it
              is the server/container filesystem.
            </p>
          )}
        </div>

        {form.access_mode === "integration" && (
          <div className="form-group">
            <label className="form-label">Git Integration</label>
            {orgIntegrations.length === 0 ? (
              <div
                className="alert alert-warning"
                style={{ padding: "0.5rem 0.75rem" }}
              >
                <span className="text-xs">
                  No active Git integrations for this org.{" "}
                  <a href="/integrations" style={{ color: "var(--gw-indigo)" }}>
                    Connect one first.
                  </a>
                </span>
              </div>
            ) : (
              <select
                className="form-select"
                value={form.integration}
                onChange={(e) => set("integration", e.target.value)}
              >
                <option value="">— Select integration —</option>
                {orgIntegrations.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.provider})
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Repository Name</label>
          <input
            className="form-input"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="my-repo"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Default Branch</label>
          <input
            className="form-input"
            value={form.default_branch}
            onChange={(e) => set("default_branch", e.target.value)}
            placeholder="main"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Visibility</label>
          <select
            className="form-select"
            value={form.visibility}
            onChange={(e) => set("visibility", e.target.value)}
          >
            <option value="public">Public</option>
            <option value="private">Private</option>
            <option value="internal">Internal</option>
          </select>
        </div>
      </div>
    </Modal>
  );
}
