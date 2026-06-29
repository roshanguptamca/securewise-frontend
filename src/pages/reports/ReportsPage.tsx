import { useEffect, useState } from "react";
import { sw } from "../../api/client";
import type { Report, Project, Organization, Scan } from "../../types";
import {
  LoadingState,
  EmptyState,
  ErrorState,
} from "../../components/ui/States";
import { Modal } from "../../components/ui/Modal";

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [viewing, setViewing] = useState<Report | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      sw.reports.list(),
      sw.projects.list(),
      sw.orgs.list(),
      sw.scans.list({ status: "completed" }),
    ])
      .then(([r, p, o, s]) => {
        setReports(r.data.results ?? r.data);
        setProjects(p.data.results ?? p.data);
        setOrgs(o.data.results ?? o.data);
        setScans(s.data.results ?? s.data);
      })
      .catch(() => setError("Failed to load reports."))
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
          <h1 className="sw-page-title">Reports</h1>
          <p className="sw-page-subtitle">
            {reports.length} report{reports.length !== 1 ? "s" : ""} generated.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          + Generate Report
        </button>
      </div>

      {reports.length === 0 ? (
        <EmptyState
          title="No reports yet"
          description="Generate a report from a completed scan."
          action={
            <button className="btn-primary" onClick={() => setShowCreate(true)}>
              Generate Report
            </button>
          }
        />
      ) : (
        <div className="grid grid-3 gap-4">
          {reports.map((r) => {
            const proj = projects.find((p) => p.id === r.project);
            return (
              <div
                key={r.id}
                className="glass-card"
                style={{ padding: "1.25rem" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="badge badge-info">
                    {r.format.toUpperCase()}
                  </span>
                  <span
                    className={`badge ${r.status === "ready" ? "badge-completed" : r.status === "failed" ? "badge-failed" : "badge-queued"}`}
                  >
                    {r.status}
                  </span>
                </div>
                <h3
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    marginBottom: 4,
                  }}
                >
                  {r.title}
                </h3>
                <p className="text-xs text-muted mb-3">
                  {proj?.name ?? "—"} ·{" "}
                  {new Date(r.created_at).toLocaleDateString()}
                </p>
                {r.quality_gate_passed !== null && (
                  <div
                    className={`alert ${r.quality_gate_passed ? "alert-success" : "alert-error"} mb-3`}
                    style={{ padding: "0.4rem 0.75rem" }}
                  >
                    <span style={{ fontSize: "0.72rem" }}>
                      {r.quality_gate_passed
                        ? "✅ Quality gate passed"
                        : "❌ Quality gate failed"}
                    </span>
                  </div>
                )}
                {r.status === "ready" && (
                  <button
                    className="btn-secondary w-full"
                    style={{ fontSize: "0.78rem" }}
                    onClick={() => setViewing(r)}
                  >
                    📄 View Report
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateReportModal
          projects={projects}
          orgs={orgs}
          scans={scans}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}

      {viewing && (
        <Modal
          title={viewing.title}
          onClose={() => setViewing(null)}
          wide
          footer={
            <button
              className="btn-secondary"
              onClick={() => {
                const blob = new Blob(
                  [JSON.stringify(viewing.report_data, null, 2)],
                  { type: "application/json" },
                );
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${viewing.title}.json`;
                a.click();
              }}
            >
              ⬇ Download JSON
            </button>
          }
        >
          <pre
            style={{
              fontSize: "0.72rem",
              color: "#e2e8f0",
              overflow: "auto",
              maxHeight: 500,
            }}
          >
            {JSON.stringify(viewing.report_data, null, 2)}
          </pre>
        </Modal>
      )}
    </div>
  );
}

function CreateReportModal({
  projects,
  orgs,
  scans,
  onClose,
  onCreated,
}: {
  projects: Project[];
  orgs: Organization[];
  scans: Scan[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    organization: orgs[0]?.id ?? "",
    project: projects[0]?.id ?? "",
    scan: scans[0]?.id ?? "",
    title: "",
    format: "json",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.project || !form.title)
      return setErr("Project and title are required.");
    setSaving(true);
    try {
      await sw.reports.create({ ...form, scan: form.scan || undefined });
      onCreated();
    } catch (e: any) {
      setErr(e.response?.data?.detail ?? "Failed to create report.");
    } finally {
      setSaving(false);
    }
  };

  const filteredScans = form.project
    ? scans.filter((s) => s.project === form.project)
    : scans;

  return (
    <Modal
      title="Generate Report"
      onClose={onClose}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={submit} disabled={saving}>
            {saving ? "Generating…" : "Generate"}
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
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Scan (optional)</label>
          <select
            className="form-select"
            value={form.scan}
            onChange={(e) => set("scan", e.target.value)}
          >
            <option value="">— No scan selected —</option>
            {filteredScans.map((s) => (
              <option key={s.id} value={s.id}>
                {s.scan_type} · {new Date(s.created_at).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Report Title *</label>
          <input
            className="form-input"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Security Report – Q1 2026"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Format</label>
          <select
            className="form-select"
            value={form.format}
            onChange={(e) => set("format", e.target.value)}
          >
            <option value="json">JSON</option>
            <option value="html" disabled>
              HTML (coming soon)
            </option>
            <option value="pdf" disabled>
              PDF (coming soon)
            </option>
          </select>
        </div>
      </div>
    </Modal>
  );
}
