import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { sw } from "../../api/client";
import type {
  Scan,
  Finding,
  ScanProgress,
  ScanEngineResult,
} from "../../types";
import {
  ScanStatusBadge,
  SeverityBadge,
  FindingStatusBadge,
  EngineStatusBadge,
} from "../../components/ui/Badges";
import { LoadingState, ErrorState } from "../../components/ui/States";

const POLL_INTERVAL = 3000;

const ACTIVE_STATUSES = [
  "pending",
  "queued",
  "cloning",
  "running",
  "running_sast",
  "running_sca",
  "running_secrets",
  "running_iac",
  "running_container",
  "running_api",
  "running_dast",
  "normalizing",
];

export default function ScanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [scan, setScan] = useState<Scan | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [engineResults, setEngineResults] = useState<ScanEngineResult[]>([]);
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

  const loadProgress = useCallback(() => {
    if (!id) return;
    sw.scans
      .progress(id)
      .then((r) => {
        setProgress(r.data);
        // Prefer the cheaper progress payload's engines array; only hit the
        // dedicated engine-results endpoint when it's empty/missing.
        if (!r.data?.engines?.length) {
          return sw.scans
            .engineResults(id)
            .then((er) => setEngineResults(er.data.results ?? er.data))
            .catch(() => {});
        }
      })
      .catch(() => {
        // Progress endpoint may not exist yet on the backend — degrade gracefully.
        sw.scans
          .engineResults(id)
          .then((er) => setEngineResults(er.data.results ?? er.data))
          .catch(() => {});
      });
  }, [id]);

  useEffect(() => {
    load();
    loadProgress();
  }, [load, loadProgress]);

  // Poll while scan is active
  useEffect(() => {
    if (!scan) return;
    if (ACTIVE_STATUSES.includes(scan.status)) {
      const t = setInterval(() => {
        load();
        loadProgress();
      }, POLL_INTERVAL);
      return () => clearInterval(t);
    }
  }, [scan?.status, load, loadProgress]);

  const handleStart = async () => {
    if (!id) return;
    await sw.scans.start(id);
    load();
    loadProgress();
  };

  if (loading) return <LoadingState />;
  if (error || !scan)
    return <ErrorState message={error || "Scan not found."} />;

  const isActive = ACTIVE_STATUSES.includes(scan.status);
  const progressPct = Math.max(
    0,
    Math.min(100, progress?.progress ?? scan.progress ?? 0),
  );
  const elapsedSeconds =
    progress?.elapsed_seconds ??
    (scan.started_at
      ? Math.max(
          0,
          Math.round(
            ((scan.completed_at
              ? new Date(scan.completed_at).getTime()
              : Date.now()) -
              new Date(scan.started_at).getTime()) /
              1000,
          ),
        )
      : null);
  const findingsSoFar = progress?.findings_count ?? scan.finding_counts?.total;
  const engines = progress?.engines?.length
    ? progress.engines
    : engineResults.map((er) => ({
        engine: er.engine,
        status: er.status,
        findings_count: er.findings_count,
        skipped_reason: er.skipped_reason,
      }));

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
            {scan.duration_seconds != null
              ? ` · Duration: ${scan.duration_seconds}s`
              : elapsedSeconds != null && isActive
                ? ` · Elapsed: ${elapsedSeconds}s`
                : ""}
          </p>
        </div>
        {scan.status === "pending" && (
          <button className="btn-primary" onClick={handleStart}>
            ▶ Start Scan
          </button>
        )}
      </div>

      {/* Progress bar */}
      {isActive && (
        <div className="glass-card mb-6" style={{ padding: "1.25rem" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">
              Scan in progress ({scan.status.replace(/_/g, " ")})
            </span>
            <span className="text-sm text-muted">{progressPct}%</span>
          </div>
          <div className="sw-progress-track">
            <div
              className="sw-progress-bar"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-muted mt-2">
            {findingsSoFar ?? 0} finding
            {findingsSoFar === 1 ? "" : "s"} so far
            {elapsedSeconds != null && ` · ${elapsedSeconds}s elapsed`}
          </p>
        </div>
      )}

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

      {/* Engine progress */}
      {engines.length > 0 && (
        <div className="glass-card mb-6" style={{ overflow: "hidden" }}>
          <div
            style={{
              padding: "1rem 1.25rem",
              borderBottom: "1px solid var(--gw-border)",
            }}
          >
            <h2 style={{ fontSize: "0.95rem", fontWeight: 700 }}>Engines</h2>
          </div>
          <table className="sw-table">
            <thead>
              <tr>
                <th>Engine</th>
                <th>Status</th>
                <th>Findings</th>
                <th>Duration</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {engines.map((e, i) => {
                const detail = engineResults.find(
                  (er) => er.engine === e.engine,
                );
                return (
                  <tr key={`${e.engine}-${i}`}>
                    <td>
                      <span className="badge badge-info">
                        {String(e.engine).toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <EngineStatusBadge value={e.status} />
                    </td>
                    <td className="text-sm">{e.findings_count ?? 0}</td>
                    <td className="text-muted text-xs">
                      {detail?.duration_seconds != null
                        ? `${detail.duration_seconds}s`
                        : "—"}
                    </td>
                    <td className="text-muted text-xs">
                      {e.status === "skipped"
                        ? (e.skipped_reason ?? detail?.skipped_reason ?? "—")
                        : detail?.error_message || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

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
      {isActive && (
        <div
          className="glass-card mb-6"
          style={{ padding: "1.5rem", textAlign: "center" }}
        >
          <div className="spinner" style={{ margin: "0 auto 1rem" }} />
          <p className="text-sm text-muted">
            Scan is {scan.status.replace(/_/g, " ")}… refreshing automatically.
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
