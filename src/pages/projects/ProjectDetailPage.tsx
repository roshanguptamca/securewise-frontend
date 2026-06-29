import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { sw } from "../../api/client";
import type { Project, Scan, Finding, Repository } from "../../types";
import { SeverityBadge, ScanStatusBadge } from "../../components/ui/Badges";
import { LoadingState, ErrorState } from "../../components/ui/States";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"scans" | "findings" | "repos">("scans");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      sw.projects.get(id),
      sw.scans.list({ project: id }),
      sw.findings.list({ project: id }),
      sw.repos.list({ project: id }),
    ])
      .then(([p, s, f, r]) => {
        setProject(p.data);
        setScans(s.data.results ?? s.data);
        setFindings(f.data.results ?? f.data);
        setRepos(r.data.results ?? r.data);
      })
      .catch(() => setError("Failed to load project."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingState />;
  if (error || !project)
    return <ErrorState message={error || "Project not found."} />;

  const openFindings = findings.filter((f) => f.status === "open");
  const criticalCount = openFindings.filter(
    (f) => f.severity === "critical",
  ).length;
  const highCount = openFindings.filter((f) => f.severity === "high").length;

  return (
    <div>
      <div className="breadcrumb">
        <Link to="/projects">Projects</Link>
        <span className="sep">/</span>
        <span className="current">{project.name}</span>
      </div>

      <div className="sw-page-header">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="sw-page-title">{project.name}</h1>
            <SeverityBadge value={project.risk_level} />
          </div>
          {project.description && (
            <p className="sw-page-subtitle">{project.description}</p>
          )}
        </div>
        <div className="flex gap-3">
          <Link to={`/scans?project=${id}`} className="btn-secondary">
            View Scans
          </Link>
          <Link to={`/findings?project=${id}`} className="btn-primary">
            🐛 Findings ({openFindings.length})
          </Link>
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-4 gap-4 mb-6">
        <div className="stat-card">
          <div className="stat-value">{scans.length}</div>
          <div className="stat-label">Scans</div>
        </div>
        <div className="stat-card">
          <div
            className="stat-value"
            style={{
              fontSize: "1.6rem",
              color: criticalCount > 0 ? "#ef4444" : undefined,
            }}
          >
            {criticalCount}
          </div>
          <div className="stat-label">Critical Findings</div>
        </div>
        <div className="stat-card">
          <div
            className="stat-value"
            style={{
              fontSize: "1.6rem",
              color: highCount > 0 ? "#f97316" : undefined,
            }}
          >
            {highCount}
          </div>
          <div className="stat-label">High Findings</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{repos.length}</div>
          <div className="stat-label">Repositories</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sw-tabs">
        {(["scans", "findings", "repos"] as const).map((t) => (
          <button
            key={t}
            className={`sw-tab${tab === t ? " active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "scans" && `Scans (${scans.length})`}
            {t === "findings" && `Open Findings (${openFindings.length})`}
            {t === "repos" && `Repositories (${repos.length})`}
          </button>
        ))}
      </div>

      {tab === "scans" && (
        <div className="glass-card" style={{ overflow: "hidden" }}>
          <table className="sw-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Status</th>
                <th>Branch</th>
                <th>Findings</th>
                <th>Date</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {scans.map((s) => (
                <tr key={s.id}>
                  <td>
                    <span className="badge badge-info">{s.scan_type}</span>
                  </td>
                  <td>
                    <ScanStatusBadge value={s.status} />
                  </td>
                  <td className="text-muted text-sm">{s.branch || "—"}</td>
                  <td>
                    {s.finding_counts.critical > 0 && (
                      <span
                        className="badge badge-critical"
                        style={{ marginRight: 4 }}
                      >
                        {s.finding_counts.critical}C
                      </span>
                    )}
                    {s.finding_counts.high > 0 && (
                      <span className="badge badge-high">
                        {s.finding_counts.high}H
                      </span>
                    )}
                    {s.finding_counts.total === 0 && (
                      <span className="text-subtle">—</span>
                    )}
                  </td>
                  <td className="text-subtle text-xs">
                    {new Date(s.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <Link
                      to={`/scans/${s.id}`}
                      className="text-sm"
                      style={{ color: "var(--gw-indigo)" }}
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
              {scans.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="text-muted text-sm"
                    style={{ textAlign: "center", padding: "2rem" }}
                  >
                    No scans yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "findings" && (
        <div className="glass-card" style={{ overflow: "hidden" }}>
          <table className="sw-table">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Title</th>
                <th>CWE</th>
                <th>OWASP</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {openFindings.map((f) => (
                <tr key={f.id}>
                  <td>
                    <SeverityBadge value={f.severity} />
                  </td>
                  <td
                    className="text-sm"
                    style={{
                      maxWidth: 260,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {f.title}
                  </td>
                  <td className="text-muted text-xs">{f.cwe_id || "—"}</td>
                  <td className="text-muted text-xs">
                    {f.owasp_category || "—"}
                  </td>
                  <td>
                    <span className="badge badge-open">open</span>
                  </td>
                  <td>
                    <Link
                      to={`/findings/${f.id}`}
                      className="text-sm"
                      style={{ color: "var(--gw-indigo)" }}
                    >
                      Detail →
                    </Link>
                  </td>
                </tr>
              ))}
              {openFindings.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="text-muted text-sm"
                    style={{ textAlign: "center", padding: "2rem" }}
                  >
                    No open findings. 🎉
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "repos" && (
        <div className="grid grid-3 gap-4">
          {repos.map((r) => (
            <div
              key={r.id}
              className="glass-card-sm"
              style={{ padding: "1rem" }}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-sm font-semibold"
                  style={{ color: "var(--gw-text-primary)" }}
                >
                  {r.name}
                </span>
                <span
                  className={`badge ${r.visibility === "public" ? "badge-public" : "badge-private"}`}
                >
                  {r.visibility}
                </span>
              </div>
              <a
                href={r.repository_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-muted truncate"
                style={{ display: "block" }}
              >
                {r.repository_url}
              </a>
              <div className="text-xs text-subtle mt-2">
                Branch: {r.default_branch}
              </div>
            </div>
          ))}
          {repos.length === 0 && (
            <div
              className="glass-card-sm"
              style={{ padding: "1rem", gridColumn: "1/-1" }}
            >
              <p className="text-muted text-sm text-center">
                No repositories linked yet.{" "}
                <Link to="/repositories">Add one.</Link>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
