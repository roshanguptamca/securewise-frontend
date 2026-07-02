import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { sw } from "../../api/client";
import type {
  Scan,
  Project,
  Organization,
  Repository,
  ScanPolicy,
} from "../../types";
import { ScanStatusBadge } from "../../components/ui/Badges";
import {
  LoadingState,
  EmptyState,
  ErrorState,
} from "../../components/ui/States";
import { Modal } from "../../components/ui/Modal";

export default function ScansPage() {
  const [searchParams] = useSearchParams();
  const projectFilter = searchParams.get("project") ?? "";

  const [scans, setScans] = useState<Scan[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [policies, setPolicies] = useState<ScanPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      sw.scans.list(projectFilter ? { project: projectFilter } : {}),
      sw.projects.list(),
      sw.orgs.list(),
      sw.repos.list(),
      sw.policies.list(),
    ])
      .then(([sc, pr, or, rp, pol]) => {
        setScans(sc.data.results ?? sc.data);
        setProjects(pr.data.results ?? pr.data);
        setOrgs(or.data.results ?? or.data);
        setRepositories(rp.data.results ?? rp.data);
        setPolicies(pol.data.results ?? pol.data);
      })
      .catch(() => setError("Failed to load scans."))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, [projectFilter]);

  const handleStart = async (id: string) => {
    setActionId(id);
    await sw.scans.start(id).catch(() => {});
    load();
    setActionId(null);
  };

  const handleCancel = async (id: string) => {
    setActionId(id);
    await sw.scans.cancel(id).catch(() => {});
    load();
    setActionId(null);
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <div className="sw-page-header">
        <div>
          <h1 className="sw-page-title">Scans</h1>
          <p className="sw-page-subtitle">
            {scans.length} scan{scans.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          + New Scan
        </button>
      </div>

      {scans.length === 0 ? (
        <EmptyState
          title="No scans yet"
          description="Create a scan to analyze your repositories."
          action={
            <button className="btn-primary" onClick={() => setShowCreate(true)}>
              Start Scan
            </button>
          }
        />
      ) : (
        <div className="glass-card" style={{ overflow: "hidden" }}>
          <table className="sw-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Type</th>
                <th>Status</th>
                <th>Critical</th>
                <th>High</th>
                <th>Duration</th>
                <th>Triggered by</th>
                <th>Date</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {scans.map((scan) => (
                <tr key={scan.id}>
                  <td>
                    <Link
                      to={`/projects/${scan.project}`}
                      className="text-sm font-semibold"
                      style={{ color: "var(--gw-text-primary)" }}
                    >
                      {projects.find((p) => p.id === scan.project)?.name ??
                        scan.project.slice(0, 8)}
                    </Link>
                  </td>
                  <td>
                    <span className="badge badge-info">{scan.scan_type}</span>
                  </td>
                  <td>
                    <ScanStatusBadge value={scan.status} />
                  </td>
                  <td>
                    {scan.finding_counts.critical > 0 ? (
                      <span className="badge badge-critical">
                        {scan.finding_counts.critical}
                      </span>
                    ) : (
                      <span className="text-subtle text-xs">0</span>
                    )}
                  </td>
                  <td>
                    {scan.finding_counts.high > 0 ? (
                      <span className="badge badge-high">
                        {scan.finding_counts.high}
                      </span>
                    ) : (
                      <span className="text-subtle text-xs">0</span>
                    )}
                  </td>
                  <td className="text-muted text-xs">
                    {scan.duration_seconds != null
                      ? `${scan.duration_seconds}s`
                      : "—"}
                  </td>
                  <td className="text-muted text-xs">
                    {scan.triggered_by_detail?.username ?? "—"}
                  </td>
                  <td className="text-subtle text-xs">
                    {new Date(scan.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <Link
                        to={`/scans/${scan.id}`}
                        className="btn-icon"
                        title="View"
                      >
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </Link>
                      {scan.status === "pending" && (
                        <button
                          className="btn-icon"
                          title="Start"
                          disabled={actionId === scan.id}
                          onClick={() => handleStart(scan.id)}
                          style={{ color: "#86efac" }}
                        >
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                        </button>
                      )}
                      {["pending", "queued", "running"].includes(
                        scan.status,
                      ) && (
                        <button
                          className="btn-icon"
                          title="Cancel"
                          disabled={actionId === scan.id}
                          onClick={() => handleCancel(scan.id)}
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
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateScanModal
          projects={projects}
          orgs={orgs}
          repositories={repositories}
          policies={policies}
          defaultProject={projectFilter}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
    </div>
  );
}

const ENGINE_OPTIONS = [
  "sast",
  "dast",
  "sca",
  "secrets",
  "iac",
  "container",
  "api",
] as const;

function CreateScanModal({
  projects,
  orgs,
  repositories,
  policies,
  defaultProject,
  onClose,
  onCreated,
}: {
  projects: Project[];
  orgs: Organization[];
  repositories: Repository[];
  policies: ScanPolicy[];
  defaultProject?: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    organization: orgs[0]?.id ?? "",
    project: defaultProject || projects[0]?.id || "",
    repository: "",
    policy: "",
    scan_type: "sast",
    branch: "",
    commit_sha: "",
    target_url: "",
    api_spec_url: "",
    docker_image: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [autoStart, setAutoStart] = useState(true);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.project || !form.organization)
      return setErr("Project and organization are required.");
    setSaving(true);
    try {
      const payload = {
        ...form,
        repository: form.repository || undefined,
        policy: form.policy || undefined,
      };
      const res = await sw.scans.create(payload);
      if (autoStart) await sw.scans.start(res.data.id);
      onCreated();
    } catch (e: any) {
      const data = e.response?.data;
      const fieldError =
        data &&
        typeof data === "object" &&
        Object.values(data).find(
          (v) => Array.isArray(v) || typeof v === "string",
        );
      const message = Array.isArray(fieldError) ? fieldError[0] : fieldError;
      setErr(data?.detail ?? message ?? "Failed to create scan.");
    } finally {
      setSaving(false);
    }
  };

  const filteredProjects = form.organization
    ? projects.filter((p) => p.organization === form.organization)
    : projects;

  const filteredRepositories = form.project
    ? repositories.filter(
        (r) =>
          r.project === form.project || r.organization === form.organization,
      )
    : repositories;

  const filteredPolicies = form.organization
    ? policies.filter(
        (p) =>
          p.organization === form.organization &&
          (!p.project || p.project === form.project),
      )
    : policies;

  const isFull = form.scan_type === "full";
  const showTargetUrl = form.scan_type === "dast" || isFull;
  const showApiSpec = form.scan_type === "api" || isFull;
  const showDockerImage = form.scan_type === "container" || isFull;
  const needsRepository =
    ["sast", "sca", "secrets", "iac", "container", "full"].includes(
      form.scan_type,
    ) && !(form.scan_type === "full" && (form.target_url || form.api_spec_url));

  return (
    <Modal
      title="Start New Scan"
      onClose={onClose}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={submit} disabled={saving}>
            {saving ? "Starting…" : autoStart ? "Create & Start" : "Create"}
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
          <label className="form-label">Project *</label>
          <select
            className="form-select"
            value={form.project}
            onChange={(e) => set("project", e.target.value)}
          >
            {filteredProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">
            Repository {needsRepository ? "*" : "(optional)"}
          </label>
          <select
            className="form-select"
            value={form.repository}
            onChange={(e) => set("repository", e.target.value)}
          >
            <option value="">— Select a repository —</option>
            {filteredRepositories.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.repository_url})
              </option>
            ))}
          </select>
          {filteredRepositories.length === 0 && (
            <p className="text-xs text-muted" style={{ marginTop: 4 }}>
              No repositories found for this project/organization. Add one under
              Repositories first.
            </p>
          )}
          {needsRepository && !form.repository && (
            <p
              className="text-xs"
              style={{ marginTop: 4, color: "var(--gw-red, #f87171)" }}
            >
              This scan type needs a repository, or it will find nothing.
            </p>
          )}
        </div>
        <div className="form-group">
          <label className="form-label">Quality Gate Policy (optional)</label>
          <select
            className="form-select"
            value={form.policy}
            onChange={(e) => set("policy", e.target.value)}
          >
            <option value="">— No policy (gate not evaluated) —</option>
            {filteredPolicies.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted" style={{ marginTop: 4 }}>
            Without a policy attached, the quality gate is not evaluated —
            findings are still recorded, but no pass/fail verdict is shown.
          </p>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="scan-type-select">
            Scan Type
          </label>
          <select
            id="scan-type-select"
            className="form-select"
            value={form.scan_type}
            onChange={(e) => set("scan_type", e.target.value)}
          >
            {[...ENGINE_OPTIONS, "full"].map((t) => (
              <option key={t} value={t}>
                {t.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
        {isFull && (
          <div className="alert alert-info text-xs">
            <span>🧩</span>
            <span>
              Full Scan will run: <strong>SAST, SCA, Secrets, IaC</strong>, plus{" "}
              <strong>Container, API, and DAST</strong> conditionally — only
              engines with the required configuration below (target URL, API
              spec, Docker image) will actually execute; others are skipped with
              a reason shown on the scan detail page.
            </span>
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Branch (optional)</label>
          <input
            className="form-input"
            value={form.branch}
            onChange={(e) => set("branch", e.target.value)}
            placeholder="main"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Commit SHA (optional)</label>
          <input
            className="form-input"
            value={form.commit_sha}
            onChange={(e) => set("commit_sha", e.target.value)}
            placeholder="a1b2c3d…"
          />
        </div>
        {showTargetUrl && (
          <div className="form-group">
            <label className="form-label" htmlFor="target-url-input">
              Target URL (for DAST)
            </label>
            <input
              id="target-url-input"
              className="form-input"
              value={form.target_url}
              onChange={(e) => set("target_url", e.target.value)}
              placeholder="https://staging.example.com"
            />
            <p className="text-xs mt-2" style={{ color: "#fca5a5" }}>
              ⚠️ Only scan targets you own or are authorized to test.
            </p>
          </div>
        )}
        {showApiSpec && (
          <div className="form-group">
            <label className="form-label" htmlFor="api-spec-url-input">
              OpenAPI/Swagger URL or path (for API scan)
            </label>
            <input
              id="api-spec-url-input"
              className="form-input"
              value={form.api_spec_url}
              onChange={(e) => set("api_spec_url", e.target.value)}
              placeholder="https://api.example.com/openapi.json"
            />
          </div>
        )}
        {showDockerImage && (
          <div className="form-group">
            <label className="form-label" htmlFor="docker-image-input">
              Docker Image (for container scan)
            </label>
            <input
              id="docker-image-input"
              className="form-input"
              value={form.docker_image}
              onChange={(e) => set("docker_image", e.target.value)}
              placeholder="myorg/myapp:latest"
            />
          </div>
        )}
        <label
          className="flex items-center gap-2 text-sm"
          style={{ cursor: "pointer" }}
        >
          <input
            type="checkbox"
            checked={autoStart}
            onChange={(e) => setAutoStart(e.target.checked)}
          />
          <span style={{ color: "var(--gw-text-body)" }}>
            Start scan immediately after creation
          </span>
        </label>
        <div className="alert alert-info text-xs">
          <span>🛡️</span>
          <span>
            Runs <strong>real scanning engines</strong> (Gitleaks for secrets,
            plus additional analyzers) with graceful fallback engines when an
            optional external tool isn't installed — fallback status is shown as
            "engine unavailable" where applicable.
          </span>
        </div>
      </div>
    </Modal>
  );
}
