import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { sw } from "../../api/client";
import type { Scan, Finding } from "../../types";
import {
  ScanStatusBadge,
  SeverityBadge,
  FindingStatusBadge,
} from "../../components/ui/Badges";
import { LoadingState, ErrorState } from "../../components/ui/States";

const POLL_INTERVAL = 3000;

export default function ScanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [scan, setScan] = useState<Scan | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    if (!id) return;
    Promise.all([sw.scans.get(id), sw.findings.list({ scan: id })])
      .then(([s, f]) => {
        setScan(s.data);
        setFindings(f.data.results ?? f.data);
      })
      .catch(() => setError("Failed to load scan."))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Poll while scan is active
  useEffect(() => {
    if (!scan) return;
    if (["running", "queued", "pending"].includes(scan.status)) {
      const t = setInterval(load, POLL_INTERVAL);
      return () => clearInterval(t);
    }
  }, [scan?.status, load]);

  const handleStart = async () => {
    if (!id) return;
    await sw.scans.start(id);
    load();
  };

  if (loading) return <LoadingState />;
  if (error || !scan)
    return <ErrorState message={error || "Scan not found."} />;

  return (
    <div>
      <div className="breadcrumb">
        <Link to="/scans">Scans</Link>
        <span className="sep">/</span>
        <span className="current">{scan.id.slice(0, 8)}…</span>
      </div>

      <div className="sw-page-header">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="sw-page-title">Scan Detail</h1>
            <ScanStatusBadge value={scan.status} />
            <span className="badge badge-info">
              {scan.scan_type.toUpperCase()}
            </span>
          </div>
          <p className="sw-page-subtitle">
            Triggered: {new Date(scan.created_at).toLocaleString()}
            {scan.duration_seconds != null &&
              ` · Duration: ${scan.duration_seconds}s`}
          </p>
        </div>
        {scan.status === "pending" && (
          <button className="btn-primary" onClick={handleStart}>
            ▶ Start Scan
          </button>
        )}
      </div>

      {/* Meta cards */}
      <div className="grid grid-4 gap-4 mb-6">
        {(["critical", "high", "medium", "low"] as const).map((sev) => (
          <div key={sev} className="stat-card">
            <SeverityBadge value={sev} />
            <div
              className="stat-value"
              style={{ fontSize: "1.6rem", marginTop: 8 }}
            >
              {scan.finding_counts[sev]}
            </div>
          </div>
        ))}
      </div>

      {/* Quality gate */}
      {scan.quality_gate_passed !== null && (
        <div
          className={`alert ${scan.quality_gate_passed ? "alert-success" : "alert-error"} mb-6`}
        >
          <span>{scan.quality_gate_passed ? "✅" : "❌"}</span>
          <span>
            Quality gate:{" "}
            <strong>{scan.quality_gate_passed ? "PASSED" : "FAILED"}</strong>
          </span>
        </div>
      )}

      {scan.error_message && (
        <div className="alert alert-error mb-6">
          <span>⚠️</span>
          <span>{scan.error_message}</span>
        </div>
      )}

      {/* Running pulse */}
      {["queued", "running"].includes(scan.status) && (
        <div
          className="glass-card mb-6"
          style={{ padding: "1.5rem", textAlign: "center" }}
        >
          <div className="spinner" style={{ margin: "0 auto 1rem" }} />
          <p className="text-sm text-muted">
            Scan is {scan.status}… refreshing automatically.
          </p>
        </div>
      )}

      {/* Findings table */}
      {findings.length > 0 && (
        <div className="glass-card" style={{ overflow: "hidden" }}>
          <div
            className="flex items-center justify-between"
            style={{
              padding: "1rem 1.25rem",
              borderBottom: "1px solid var(--gw-border)",
            }}
          >
            <h2 style={{ fontSize: "0.95rem", fontWeight: 700 }}>
              Findings ({findings.length})
            </h2>
            <Link
              to={`/findings?scan=${id}`}
              className="text-sm"
              style={{ color: "var(--gw-indigo)" }}
            >
              View all →
            </Link>
          </div>
          <table className="sw-table">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Title</th>
                <th>Type</th>
                <th>CWE</th>
                <th>OWASP</th>
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
                  <td className="text-sm" style={{ maxWidth: 280 }}>
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
