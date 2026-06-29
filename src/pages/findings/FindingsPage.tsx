import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { sw } from "../../api/client";
import type { Finding, Severity, FindingStatus } from "../../types";
import { SeverityBadge, FindingStatusBadge } from "../../components/ui/Badges";
import {
  LoadingState,
  EmptyState,
  ErrorState,
} from "../../components/ui/States";

const SEVERITIES: Severity[] = ["critical", "high", "medium", "low", "info"];
const STATUSES: FindingStatus[] = [
  "open",
  "fixed",
  "accepted_risk",
  "false_positive",
  "ignored",
];

export default function FindingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const projectFilter = searchParams.get("project") ?? "";
  const scanFilter = searchParams.get("scan") ?? "";
  const sevFilter = searchParams.get("severity") ?? "";
  const statusFilter = searchParams.get("status") ?? "";

  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const load = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (projectFilter) params.project = projectFilter;
    if (scanFilter) params.scan = scanFilter;
    if (sevFilter) params.severity = sevFilter;
    if (statusFilter) params.status = statusFilter;
    if (search) params.search = search;
    sw.findings
      .list(params)
      .then((r) => setFindings(r.data.results ?? r.data))
      .catch(() => setError("Failed to load findings."))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, [projectFilter, scanFilter, sevFilter, statusFilter]);

  const setFilter = (k: string, v: string) => {
    const next = new URLSearchParams(searchParams);
    if (v) next.set(k, v);
    else next.delete(k);
    setSearchParams(next);
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const openCount = findings.filter((f) => f.status === "open").length;
  const critCount = findings.filter(
    (f) => f.severity === "critical" && f.status === "open",
  ).length;

  return (
    <div>
      <div className="sw-page-header">
        <div>
          <h1 className="sw-page-title">Findings</h1>
          <p className="sw-page-subtitle">
            {openCount} open ·{" "}
            {critCount > 0 ? `${critCount} critical` : "no critical"}
          </p>
        </div>
      </div>

      {/* Filters row */}
      <div
        className="flex gap-3 mb-4"
        style={{ flexWrap: "wrap", alignItems: "center" }}
      >
        <div className="search-input-wrap">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            className="form-input search-input"
            placeholder="Search title, CWE…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
          />
        </div>
        <select
          className="form-select"
          style={{ width: "auto" }}
          value={sevFilter}
          onChange={(e) => setFilter("severity", e.target.value)}
        >
          <option value="">All Severities</option>
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className="form-select"
          style={{ width: "auto" }}
          value={statusFilter}
          onChange={(e) => setFilter("status", e.target.value)}
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
        {(sevFilter || statusFilter || projectFilter || scanFilter) && (
          <button className="btn-secondary" onClick={() => setSearchParams({})}>
            Clear filters
          </button>
        )}
      </div>

      {findings.length === 0 ? (
        <EmptyState
          title="No findings found"
          description="Try adjusting your filters or run a scan."
        />
      ) : (
        <div className="glass-card" style={{ overflow: "hidden" }}>
          <table className="sw-table">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Title</th>
                <th>Scanner</th>
                <th>CWE</th>
                <th>OWASP</th>
                <th>File</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {findings.map((f) => (
                <tr key={f.id}>
                  <td>
                    <SeverityBadge value={f.severity} />
                  </td>
                  <td
                    className="text-sm font-semibold"
                    style={{
                      maxWidth: 260,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      color: "var(--gw-text-primary)",
                    }}
                  >
                    {f.title}
                  </td>
                  <td>
                    <span className="badge badge-info">
                      {f.scanner_type || "—"}
                    </span>
                  </td>
                  <td className="text-muted text-xs">{f.cwe_id || "—"}</td>
                  <td className="text-muted text-xs">
                    {f.owasp_category || "—"}
                  </td>
                  <td
                    className="text-muted text-xs truncate"
                    style={{ maxWidth: 160 }}
                  >
                    {f.file_path || "—"}
                  </td>
                  <td>
                    <FindingStatusBadge value={f.status} />
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
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
