import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { sw } from "../api/client";
import type { DashboardSummary, Severity } from "../types";
import { ScanStatusBadge, SeverityBadge } from "../components/ui/Badges";
import { LoadingState, ErrorState } from "../components/ui/States";

const SEV_COLORS: Record<Severity, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
  info: "#22d3ee",
};

// The current CWE Top 25 Most Dangerous Software Weaknesses (2023 edition),
// used to compute rough coverage of findings across the list.
const CWE_TOP_25 = [
  "CWE-787",
  "CWE-79",
  "CWE-89",
  "CWE-416",
  "CWE-78",
  "CWE-20",
  "CWE-125",
  "CWE-22",
  "CWE-352",
  "CWE-434",
  "CWE-862",
  "CWE-476",
  "CWE-287",
  "CWE-190",
  "CWE-502",
  "CWE-77",
  "CWE-119",
  "CWE-798",
  "CWE-918",
  "CWE-306",
  "CWE-362",
  "CWE-269",
  "CWE-94",
  "CWE-863",
  "CWE-276",
];
const OWASP_TOP_10 = [
  "A01",
  "A02",
  "A03",
  "A04",
  "A05",
  "A06",
  "A07",
  "A08",
  "A09",
  "A10",
];

export default function Dashboard() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    sw.dashboard()
      .then((r) => setData(r.data))
      .catch(() => setError("Failed to load dashboard."))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState message={error} onRetry={load} />;

  const score = data.security_score;
  const scoreColor =
    score >= 80 ? "#22c55e" : score >= 50 ? "#eab308" : "#ef4444";

  // These fields (owasp_categories_covered, cwe_ids_covered, quality_gate_pass_rate)
  // are not guaranteed to exist on the backend yet — render defensively.
  const owaspCovered: string[] = (data as any)?.owasp_categories_covered ?? [];
  const cweCovered: string[] = (data as any)?.cwe_ids_covered ?? [];
  const owaspCoverageCount = OWASP_TOP_10.filter((c) =>
    owaspCovered.some((o) => o?.startsWith(c)),
  ).length;
  const cweCoverageCount = CWE_TOP_25.filter((c) =>
    cweCovered.includes(c),
  ).length;
  const qualityGatePassRate: number | null =
    (data as any)?.quality_gate_pass_rate ?? null;

  return (
    <div>
      <div className="sw-page-header">
        <div>
          <h1 className="sw-page-title">Dashboard</h1>
          <p className="sw-page-subtitle">
            Security posture overview across all your projects.
          </p>
        </div>
        <Link to="/scans" className="btn-primary">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M12 5v14M5 12l7-7 7 7" strokeLinecap="round" />
          </svg>
          New Scan
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-4 gap-4 mb-6">
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ background: "rgba(99,102,241,0.15)" }}
          >
            📁
          </div>
          <div className="stat-value">{data.total_projects}</div>
          <div className="stat-label">Total Projects</div>
        </div>
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ background: "rgba(34,211,238,0.15)" }}
          >
            🔍
          </div>
          <div className="stat-value">{data.total_scans}</div>
          <div className="stat-label">Total Scans</div>
        </div>
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ background: "rgba(239,68,68,0.15)" }}
          >
            🐛
          </div>
          <div className="stat-value">{data.open_findings}</div>
          <div className="stat-label">Open Findings</div>
        </div>
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ background: "rgba(249,115,22,0.15)" }}
          >
            🔥
          </div>
          <div className="stat-value">{data.critical_high_count}</div>
          <div className="stat-label">Critical / High</div>
        </div>
      </div>

      <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 300px" }}>
        {/* Recent scans */}
        <div
          className="glass-card"
          style={{ padding: "1.25rem", overflow: "hidden" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 style={{ fontSize: "0.95rem", fontWeight: 700 }}>
              Recent Scans
            </h2>
            <Link
              to="/scans"
              className="text-sm"
              style={{ color: "var(--gw-indigo)" }}
            >
              View all →
            </Link>
          </div>
          {data.recent_scans.length === 0 ? (
            <p className="text-muted text-sm">
              No scans yet. <Link to="/scans">Start your first scan.</Link>
            </p>
          ) : (
            <table className="sw-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Findings</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_scans.map((scan) => (
                  <tr key={scan.id}>
                    <td>
                      <Link
                        to={`/scans/${scan.id}`}
                        className="text-sm font-semibold"
                        style={{ color: "var(--gw-text-primary)" }}
                      >
                        {scan.project}
                      </Link>
                    </td>
                    <td>
                      <span className="badge badge-info">{scan.scan_type}</span>
                    </td>
                    <td>
                      <ScanStatusBadge value={scan.status} />
                    </td>
                    <td>
                      {scan.finding_counts?.critical > 0 && (
                        <span
                          className="badge badge-critical"
                          style={{ marginRight: 4 }}
                        >
                          {scan.finding_counts.critical}C
                        </span>
                      )}
                      {scan.finding_counts?.high > 0 && (
                        <span className="badge badge-high">
                          {scan.finding_counts.high}H
                        </span>
                      )}
                      {scan.finding_counts?.total === 0 && (
                        <span className="text-subtle text-xs">—</span>
                      )}
                    </td>
                    <td className="text-subtle text-xs">
                      {new Date(scan.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Right column */}
        <div className="flex-col gap-4">
          {/* Security score */}
          <div
            className="glass-card"
            style={{ padding: "1.25rem", textAlign: "center" }}
          >
            <h2
              style={{
                fontSize: "0.85rem",
                fontWeight: 700,
                marginBottom: "1rem",
              }}
            >
              Security Score
            </h2>
            <div
              style={{
                width: 100,
                height: 100,
                borderRadius: "50%",
                margin: "0 auto 0.75rem",
                background: `conic-gradient(${scoreColor} ${score}%, rgba(255,255,255,0.08) 0%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 0 24px ${scoreColor}44`,
              }}
            >
              <div
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: "50%",
                  background: "var(--gw-bg-2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.6rem",
                  fontWeight: 800,
                  color: scoreColor,
                }}
              >
                {score}
              </div>
            </div>
            <p className="text-xs text-muted">
              {score >= 80
                ? "✅ Good posture"
                : score >= 50
                  ? "⚠️ Needs attention"
                  : "🚨 Critical issues"}
            </p>
          </div>

          {/* Findings by severity */}
          <div className="glass-card" style={{ padding: "1.25rem" }}>
            <h2
              style={{
                fontSize: "0.85rem",
                fontWeight: 700,
                marginBottom: "1rem",
              }}
            >
              Open Findings
            </h2>
            <div className="flex-col gap-3">
              {(
                ["critical", "high", "medium", "low", "info"] as Severity[]
              ).map((sev) => {
                const count = data.severity_counts[sev] ?? 0;
                const max = Math.max(...Object.values(data.severity_counts), 1);
                return (
                  <div key={sev}>
                    <div className="flex items-center justify-between mb-1">
                      <SeverityBadge value={sev} />
                      <span
                        className="text-xs font-semibold"
                        style={{ color: SEV_COLORS[sev] }}
                      >
                        {count}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 4,
                        background: "rgba(255,255,255,0.08)",
                        borderRadius: 2,
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          borderRadius: 2,
                          width: `${(count / max) * 100}%`,
                          background: SEV_COLORS[sev],
                          transition: "width 0.4s ease",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top risky projects */}
          {data.top_risky_projects.length > 0 && (
            <div className="glass-card" style={{ padding: "1.25rem" }}>
              <h2
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  marginBottom: "0.75rem",
                }}
              >
                Riskiest Projects
              </h2>
              <div className="flex-col gap-2">
                {data.top_risky_projects.map((p, i) => (
                  <Link
                    key={p["project__id"]}
                    to={`/projects/${p["project__id"]}`}
                    className="flex items-center justify-between glass-card-sm"
                    style={{
                      padding: "0.5rem 0.75rem",
                      textDecoration: "none",
                    }}
                  >
                    <span
                      className="text-sm"
                      style={{ color: "var(--gw-text-body)" }}
                    >
                      {i + 1}. {p["project__name"]}
                    </span>
                    <span className="badge badge-high">{p.risk_count}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Coverage & quality gate widgets */}
          <div className="glass-card" style={{ padding: "1.25rem" }}>
            <h2
              style={{
                fontSize: "0.85rem",
                fontWeight: 700,
                marginBottom: "0.75rem",
              }}
            >
              Coverage & Quality
            </h2>
            <div className="flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-subtle">
                  OWASP Top 10 coverage
                </span>
                <span className="text-xs font-semibold">
                  {owaspCoverageCount} / {OWASP_TOP_10.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-subtle">CWE Top 25 coverage</span>
                <span className="text-xs font-semibold">
                  {cweCoverageCount} / {CWE_TOP_25.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-subtle">
                  Quality gate pass rate
                </span>
                <span className="text-xs font-semibold">
                  {qualityGatePassRate != null
                    ? `${Math.round(qualityGatePassRate)}%`
                    : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
