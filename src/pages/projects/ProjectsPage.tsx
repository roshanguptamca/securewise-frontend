import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { sw } from "../../api/client";
import type { Project, Organization } from "../../types";
import { SeverityBadge } from "../../components/ui/Badges";
import {
  LoadingState,
  EmptyState,
  ErrorState,
} from "../../components/ui/States";
import { Modal } from "../../components/ui/Modal";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([sw.projects.list(), sw.orgs.list()])
      .then(([pr, or]) => {
        setProjects(pr.data.results ?? pr.data);
        setOrgs(or.data.results ?? or.data);
      })
      .catch(() => setError("Failed to load projects."))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <div className="sw-page-header">
        <div>
          <h1 className="sw-page-title">Projects</h1>
          <p className="sw-page-subtitle">
            {projects.length} project{projects.length !== 1 ? "s" : ""} across
            your organizations.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          + New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create a project to start scanning your code."
          action={
            <button className="btn-primary" onClick={() => setShowCreate(true)}>
              Create Project
            </button>
          }
        />
      ) : (
        <div className="grid grid-3 gap-4">
          {projects.map((p) => (
            <Link
              key={p.id}
              to={`/projects/${p.id}`}
              style={{ textDecoration: "none" }}
            >
              <div
                className="glass-card"
                style={{ padding: "1.25rem", cursor: "pointer" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="section-label"
                    style={{ fontSize: "0.68rem" }}
                  >
                    {orgs.find((o) => o.id === p.organization)?.name ??
                      "Unknown org"}
                  </span>
                  <SeverityBadge value={p.risk_level} />
                </div>
                <h3
                  style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 6 }}
                >
                  {p.name}
                </h3>
                {p.description && (
                  <p
                    className="text-sm text-muted"
                    style={{ marginBottom: "0.75rem", lineHeight: 1.5 }}
                  >
                    {p.description}
                  </p>
                )}
                <div className="flex gap-4" style={{ marginTop: "auto" }}>
                  <span className="text-xs text-muted">
                    🔍 {p.scan_count} scans
                  </span>
                  <span
                    className="text-xs"
                    style={{
                      color:
                        p.open_findings_count > 0
                          ? "#fca5a5"
                          : "var(--gw-text-muted)",
                    }}
                  >
                    🐛 {p.open_findings_count} open
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateProjectModal
          orgs={orgs}
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

function CreateProjectModal({
  orgs,
  onClose,
  onCreated,
}: {
  orgs: Organization[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    organization: orgs[0]?.id ?? "",
    name: "",
    slug: "",
    description: "",
    risk_level: "medium",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const set = (k: string, v: string) => {
    setForm((f) => ({
      ...f,
      [k]: v,
      ...(k === "name"
        ? {
            slug: v
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, ""),
          }
        : {}),
    }));
  };

  const submit = async () => {
    if (!form.name || !form.organization)
      return setErr("Name and organization are required.");
    setSaving(true);
    try {
      await sw.projects.create(form);
      onCreated();
    } catch (e: any) {
      setErr(
        e.response?.data?.detail ??
          JSON.stringify(e.response?.data) ??
          "Failed to create project.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Create Project"
      onClose={onClose}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={submit} disabled={saving}>
            {saving ? "Creating…" : "Create Project"}
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
          <label className="form-label">Project Name *</label>
          <input
            className="form-input"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="My App"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Slug</label>
          <input
            className="form-input"
            value={form.slug}
            onChange={(e) => set("slug", e.target.value)}
            placeholder="my-app"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea
            className="form-textarea"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="What does this project do?"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Risk Level</label>
          <select
            className="form-select"
            value={form.risk_level}
            onChange={(e) => set("risk_level", e.target.value)}
          >
            {["critical", "high", "medium", "low", "info"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Modal>
  );
}
