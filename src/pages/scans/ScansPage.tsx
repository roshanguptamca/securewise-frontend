import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { sw } from "../../api/client";
import type {
  Organization,
  Project,
  Repository,
  Scan,
  ScanPolicy,
} from "../../types";
import { ScanStatusBadge } from "../../components/ui/Badges";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../components/ui/States";
import { Modal } from "../../components/ui/Modal";

const RETRYABLE_SCAN_STATUSES = [
  "failed",
  "cancelled",
  "completed_with_warnings",
  "completed",
] as readonly string[];

function parseApiError(error: any): string {
  const data = error?.response?.data;
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    for (const value of Object.values(data)) {
      if (typeof value === "string") return value;
      if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    }
  }
  return "Request failed.";
}

function extractFieldErrors(error: any): Record<string, string> {
  const data = error?.response?.data;
  if (!data || typeof data !== "object") return {};

  return Object.entries(data).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      if (typeof value === "string") acc[key] = value;
      else if (Array.isArray(value) && typeof value[0] === "string") {
        acc[key] = value[0];
      }
      return acc;
    },
    {},
  );
}

function findDefaultPolicyId(
  policies: ScanPolicy[],
  organizationId: string,
  projectId: string,
): string {
  return (
    policies.find(
      (policy) =>
        policy.organization === organizationId &&
        policy.is_default &&
        (!policy.project || policy.project === projectId),
    )?.id ?? ""
  );
}

function buildInitialScanForm(
  projects: Project[],
  orgs: Organization[],
  policies: ScanPolicy[],
  defaultProject?: string,
) {
  const initialProject =
    projects.find((project) => project.id === defaultProject) ??
    projects[0] ??
    null;
  const initialOrganization = initialProject?.organization ?? orgs[0]?.id ?? "";
  const initialProjectId =
    initialProject?.id ??
    projects.find((project) => project.organization === initialOrganization)
      ?.id ??
    "";

  return {
    organization: initialOrganization,
    project: initialProjectId,
    repository: "",
    policy: findDefaultPolicyId(
      policies,
      initialOrganization,
      initialProjectId,
    ),
    scan_type: "sast",
    branch: "",
    commit_sha: "",
    target_url: "",
    api_spec_url: "",
    docker_image: "",
    bypass_quality_gate: false,
    bypass_reason: "",
  };
}

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
  const [actionMessage, setActionMessage] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
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

  const runAction = async (
    id: string,
    action: () => Promise<unknown>,
    successMessage: string,
  ) => {
    setActionId(id);
    setActionMessage("");
    try {
      await action();
      setActionMessage(successMessage);
      await Promise.resolve(load());
    } catch (err: any) {
      setActionMessage(parseApiError(err));
    } finally {
      setActionId(null);
    }
  };

  const handleStart = async (id: string) => {
    await runAction(id, () => sw.scans.start(id), "Scan started.");
  };

  const handleCancel = async (id: string) => {
    await runAction(id, () => sw.scans.cancel(id), "Scan cancelled.");
  };

  const handleRetry = async (id: string) => {
    await runAction(id, () => sw.scans.retry(id), "Scan retry requested.");
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

      {actionMessage && (
        <div className="alert alert-info mb-4" role="status">
          <span>ℹ️</span>
          <span>{actionMessage}</span>
        </div>
      )}

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
              {scans.map((scan) => {
                const canRetry = RETRYABLE_SCAN_STATUSES.includes(scan.status);
                return (
                  <tr key={scan.id}>
                    <td>
                      <Link
                        to={`/projects/${scan.project}`}
                        className="text-sm font-semibold"
                        style={{ color: "var(--gw-text-primary)" }}
                      >
                        {projects.find((project) => project.id === scan.project)
                          ?.name ?? scan.project.slice(0, 8)}
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
                        {canRetry && (
                          <button
                            className="btn-icon"
                            title="Retry Scan"
                            aria-label={`Retry scan ${scan.id}`}
                            disabled={actionId === scan.id}
                            onClick={() => handleRetry(scan.id)}
                            style={{ color: "#a5b4fc" }}
                          >
                            ↻
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
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
  const [form, setForm] = useState(() =>
    buildInitialScanForm(projects, orgs, policies, defaultProject),
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [autoStart, setAutoStart] = useState(true);
  const [policyTouched, setPolicyTouched] = useState(false);

  const filteredProjects = useMemo(
    () =>
      form.organization
        ? projects.filter(
            (project) => project.organization === form.organization,
          )
        : projects,
    [form.organization, projects],
  );

  const filteredRepositories = useMemo(
    () =>
      form.project
        ? repositories.filter(
            (repository) =>
              repository.project === form.project ||
              repository.organization === form.organization,
          )
        : repositories,
    [form.organization, form.project, repositories],
  );

  const filteredPolicies = useMemo(
    () =>
      form.organization
        ? policies.filter(
            (policy) =>
              policy.organization === form.organization &&
              (!policy.project || policy.project === form.project),
          )
        : policies,
    [form.organization, form.project, policies],
  );

  useEffect(() => {
    if (filteredProjects.some((project) => project.id === form.project)) return;
    const nextProject = filteredProjects[0]?.id ?? "";
    setForm((current) => ({
      ...current,
      project: nextProject,
      repository: "",
    }));
    setPolicyTouched(false);
  }, [filteredProjects, form.project]);

  useEffect(() => {
    if (!form.repository) return;
    if (
      filteredRepositories.some(
        (repository) => repository.id === form.repository,
      )
    ) {
      return;
    }
    setForm((current) => ({ ...current, repository: "" }));
  }, [filteredRepositories, form.repository]);

  useEffect(() => {
    const defaultPolicyId = findDefaultPolicyId(
      filteredPolicies,
      form.organization,
      form.project,
    );
    const currentPolicyExists = filteredPolicies.some(
      (policy) => policy.id === form.policy,
    );

    if (!policyTouched && form.policy !== defaultPolicyId) {
      setForm((current) => ({ ...current, policy: defaultPolicyId }));
      return;
    }

    if (policyTouched && form.policy && !currentPolicyExists) {
      setForm((current) => ({ ...current, policy: "" }));
    }
  }, [
    filteredPolicies,
    form.organization,
    form.policy,
    form.project,
    policyTouched,
  ]);

  const set = (key: string, value: string | boolean) => {
    setErr("");
    setFieldErrors((current) => ({ ...current, [key]: "" }));
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async () => {
    const nextFieldErrors: Record<string, string> = {};

    if (!form.project || !form.organization) {
      setErr("Project and organization are required.");
      return;
    }

    if (form.bypass_quality_gate && !form.bypass_reason.trim()) {
      nextFieldErrors.bypass_reason =
        "Reason is required when bypassing the quality gate.";
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setErr("");
      return;
    }

    setSaving(true);
    setErr("");
    setFieldErrors({});
    try {
      const payload = {
        ...form,
        repository: form.repository || undefined,
        policy: form.policy || undefined,
        ...(form.bypass_quality_gate
          ? {
              bypass_quality_gate: true,
              bypass_reason: form.bypass_reason.trim(),
            }
          : {}),
      };

      if (!form.bypass_quality_gate) {
        delete (payload as Record<string, unknown>).bypass_reason;
      }

      const res = await sw.scans.create(payload);
      if (autoStart) await sw.scans.start(res.data.id);
      onCreated();
    } catch (error: any) {
      const extractedFieldErrors = extractFieldErrors(error);
      setFieldErrors(extractedFieldErrors);
      setErr(parseApiError(error) || "Failed to create scan.");
    } finally {
      setSaving(false);
    }
  };

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
            onChange={(event) => {
              setPolicyTouched(false);
              setForm((current) => ({
                ...current,
                organization: event.target.value,
                repository: "",
              }));
              setErr("");
            }}
          >
            {orgs.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Project *</label>
          <select
            className="form-select"
            value={form.project}
            onChange={(event) => {
              setPolicyTouched(false);
              setForm((current) => ({
                ...current,
                project: event.target.value,
                repository: "",
              }));
              setErr("");
            }}
          >
            {filteredProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
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
            onChange={(event) => set("repository", event.target.value)}
          >
            <option value="">— Select a repository —</option>
            {filteredRepositories.map((repository) => (
              <option key={repository.id} value={repository.id}>
                {repository.name} ({repository.repository_url})
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
            onChange={(event) => {
              setPolicyTouched(true);
              set("policy", event.target.value);
            }}
          >
            <option value="">— No policy (gate not evaluated) —</option>
            {filteredPolicies.map((policy) => (
              <option key={policy.id} value={policy.id}>
                {policy.name}
                {policy.is_default ? " (Default)" : ""}
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
            onChange={(event) => set("scan_type", event.target.value)}
          >
            {[...ENGINE_OPTIONS, "full"].map((type) => (
              <option key={type} value={type}>
                {type.toUpperCase()}
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
            onChange={(event) => set("branch", event.target.value)}
            placeholder="main"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Commit SHA (optional)</label>
          <input
            className="form-input"
            value={form.commit_sha}
            onChange={(event) => set("commit_sha", event.target.value)}
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
              onChange={(event) => set("target_url", event.target.value)}
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
              onChange={(event) => set("api_spec_url", event.target.value)}
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
              onChange={(event) => set("docker_image", event.target.value)}
              placeholder="myorg/myapp:latest"
            />
          </div>
        )}
        <div className="form-group">
          <label
            className="flex items-center gap-2 text-sm"
            style={{ cursor: "pointer" }}
          >
            <input
              type="checkbox"
              checked={form.bypass_quality_gate}
              onChange={(event) => {
                const checked = event.target.checked;
                set("bypass_quality_gate", checked);
                if (!checked) {
                  setForm((current) => ({ ...current, bypass_reason: "" }));
                  setFieldErrors((current) => ({
                    ...current,
                    bypass_reason: "",
                  }));
                }
              }}
            />
            <span style={{ color: "var(--gw-text-body)" }}>
              Bypass quality gate for this scan
            </span>
          </label>
          {form.bypass_quality_gate && (
            <div style={{ marginTop: 12 }}>
              <label className="form-label" htmlFor="bypass-reason-textarea">
                Reason *
              </label>
              <textarea
                id="bypass-reason-textarea"
                className="form-textarea"
                value={form.bypass_reason}
                onChange={(event) => set("bypass_reason", event.target.value)}
                placeholder="Document why this scan is allowed to proceed despite the gate."
              />
              <p className="text-xs text-muted" style={{ marginTop: 4 }}>
                Required for auditability. This will be shown on the scan detail
                page.
              </p>
              {fieldErrors.bypass_reason && (
                <p
                  className="text-xs"
                  style={{ marginTop: 4, color: "var(--gw-red, #f87171)" }}
                >
                  {fieldErrors.bypass_reason}
                </p>
              )}
            </div>
          )}
        </div>
        <label
          className="flex items-center gap-2 text-sm"
          style={{ cursor: "pointer" }}
        >
          <input
            type="checkbox"
            checked={autoStart}
            onChange={(event) => setAutoStart(event.target.checked)}
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
