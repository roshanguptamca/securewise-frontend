import { useEffect, useState } from "react";
import { sw } from "../../api/client";
import type { Organization, Project, Report, Scan } from "../../types";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../components/ui/States";
import { Modal } from "../../components/ui/Modal";

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

function slugifyFilename(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "report";
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [downloadId, setDownloadId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    Promise.all([
      sw.reports.list(),
      sw.projects.list(),
      sw.orgs.list(),
      sw.scans.list({ status: "completed" }),
    ])
      .then(([reportResponse, projectResponse, orgResponse, scanResponse]) => {
        setReports(reportResponse.data.results ?? reportResponse.data);
        setProjects(projectResponse.data.results ?? projectResponse.data);
        setOrgs(orgResponse.data.results ?? orgResponse.data);
        setScans(scanResponse.data.results ?? scanResponse.data);
      })
      .catch(() => setError("Failed to load reports."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleViewHtml = (report: Report) => {
    setActionMessage("");
    const opened = window.open(
      sw.reports.htmlUrl(report.id),
      "_blank",
      "noopener",
    );
    if (!opened) {
      setActionMessage("Unable to open the report in a new tab.");
    }
  };

  const handleDownloadPdf = async (report: Report) => {
    setDownloadId(report.id);
    setActionMessage("");
    try {
      const response = await sw.reports.pdf(report.id);
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `securewise-report-${slugifyFilename(report.title)}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (downloadError: any) {
      setActionMessage(parseApiError(downloadError));
    } finally {
      setDownloadId(null);
    }
  };

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

      {actionMessage && (
        <div className="alert alert-info mb-4" role="status">
          <span>ℹ️</span>
          <span>{actionMessage}</span>
        </div>
      )}

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
          {reports.map((report) => {
            const project = projects.find((item) => item.id === report.project);
            return (
              <div
                key={report.id}
                className="glass-card"
                style={{ padding: "1.25rem" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="badge badge-info">
                    {report.format.toUpperCase()}
                  </span>
                  <span
                    className={`badge ${report.status === "ready" ? "badge-completed" : report.status === "failed" ? "badge-failed" : "badge-queued"}`}
                  >
                    {report.status}
                  </span>
                </div>
                <h3
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    marginBottom: 4,
                  }}
                >
                  {report.title}
                </h3>
                <p className="text-xs text-muted mb-3">
                  {project?.name ?? "—"} ·{" "}
                  {new Date(report.created_at).toLocaleDateString()}
                </p>
                {report.quality_gate_passed !== null && (
                  <div
                    className={`alert ${report.quality_gate_passed ? "alert-success" : "alert-error"} mb-3`}
                    style={{ padding: "0.4rem 0.75rem" }}
                  >
                    <span style={{ fontSize: "0.72rem" }}>
                      {report.quality_gate_passed
                        ? "✅ Quality gate passed"
                        : "❌ Quality gate failed"}
                    </span>
                  </div>
                )}
                {report.status === "ready" && (
                  <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
                    <button
                      className="btn-secondary"
                      style={{ fontSize: "0.78rem", flex: 1 }}
                      onClick={() => handleViewHtml(report)}
                    >
                      View HTML
                    </button>
                    <button
                      className="btn-secondary"
                      style={{ fontSize: "0.78rem", flex: 1 }}
                      onClick={() => handleDownloadPdf(report)}
                      disabled={downloadId === report.id}
                    >
                      {downloadId === report.id
                        ? "Downloading…"
                        : "Download PDF"}
                    </button>
                  </div>
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
    report_type: "security_summary",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (key: string, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    if (!form.project || !form.title) {
      setErr("Project and title are required.");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      await sw.reports.generate({ ...form, scan: form.scan || undefined });
      onCreated();
    } catch (error: any) {
      setErr(parseApiError(error) || "Failed to create report.");
    } finally {
      setSaving(false);
    }
  };

  const filteredScans = form.project
    ? scans.filter((scan) => scan.project === form.project)
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
            onChange={(event) => set("organization", event.target.value)}
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
            onChange={(event) => set("project", event.target.value)}
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Scan (optional)</label>
          <select
            className="form-select"
            value={form.scan}
            onChange={(event) => set("scan", event.target.value)}
          >
            <option value="">— No scan selected —</option>
            {filteredScans.map((scan) => (
              <option key={scan.id} value={scan.id}>
                {scan.scan_type} ·{" "}
                {new Date(scan.created_at).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Report Title *</label>
          <input
            className="form-input"
            value={form.title}
            onChange={(event) => set("title", event.target.value)}
            placeholder="Security Report – Q1 2026"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Report Type</label>
          <select
            className="form-select"
            value={form.report_type}
            onChange={(event) => set("report_type", event.target.value)}
          >
            <option value="security_summary">Security Summary</option>
            <option value="executive_summary">Executive Summary</option>
            <option value="developer_remediation">Developer Remediation</option>
            <option value="owasp_top10">OWASP Top 10</option>
            <option value="cwe_top25">CWE Top 25</option>
            <option value="quality_gate">Quality Gate</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Format</label>
          <select
            className="form-select"
            value={form.format}
            onChange={(event) => set("format", event.target.value)}
          >
            <option value="json">JSON (raw data)</option>
            <option value="html">HTML</option>
            <option value="pdf">PDF</option>
          </select>
          <p className="text-xs text-muted mt-1">
            Every report can be viewed as branded HTML or downloaded as a
            branded PDF from the list below regardless of this choice — this
            just sets the report's default/primary format.
          </p>
        </div>
      </div>
    </Modal>
  );
}
