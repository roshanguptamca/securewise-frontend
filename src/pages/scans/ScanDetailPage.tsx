import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { sw } from "../../api/client";
import type {
  Finding,
  Scan,
  ScanEngineResult,
  ScanProgress,
} from "../../types";
import {
  EngineStatusBadge,
  FindingStatusBadge,
  ScanStatusBadge,
  SeverityBadge,
} from "../../components/ui/Badges";
import { ErrorState, LoadingState } from "../../components/ui/States";

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

export default function ScanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [scan, setScan] = useState<Scan | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [engineResults, setEngineResults] = useState<ScanEngineResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  const load = useCallback(() => {
    if (!id) return;
    setError("");
    Promise.all([sw.scans.get(id), sw.findings.list({ scan: id })])
      .then(([scanResponse, findingsResponse]) => {
        setScan(scanResponse.data);
        setFindings(findingsResponse.data.results ?? findingsResponse.data);
      })
      .catch(() => setError("Failed to load scan."))
      .finally(() => setLoading(false));
  }, [id]);

  const loadProgress = useCallback(() => {
    if (!id) return;
    sw.scans
      .progress(id)
      .then((response) => {
        setProgress(response.data);
        if (!response.data?.engines?.length) {
          return sw.scans
            .engineResults(id)
            .then((engineResponse) =>
              setEngineResults(
                engineResponse.data.results ?? engineResponse.data,
              ),
            )
            .catch(() => {});
        }
      })
      .catch(() => {
        sw.scans
          .engineResults(id)
          .then((engineResponse) =>
            setEngineResults(
              engineResponse.data.results ?? engineResponse.data,
            ),
          )
          .catch(() => {});
      });
  }, [id]);

  useEffect(() => {
    load();
    loadProgress();
  }, [load, loadProgress]);

  useEffect(() => {
    if (!scan || !ACTIVE_STATUSES.includes(scan.status)) return;
    const timer = setInterval(() => {
      load();
      loadProgress();
    }, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [load, loadProgress, scan]);

  const runScanAction = async (
    action: () => Promise<unknown>,
    successMessage: string,
  ) => {
    setActionLoading(true);
    setActionMessage("");
    try {
      await action();
      setActionMessage(successMessage);
      load();
      loadProgress();
    } catch (actionError: any) {
      setActionMessage(parseApiError(actionError));
    } finally {
      setActionLoading(false);
    }
  };

  const handleStart = async () => {
    if (!id) return;
    await runScanAction(() => sw.scans.start(id), "Scan started.");
  };

  const handleRetry = async () => {
    if (!id) return;
    await runScanAction(() => sw.scans.retry(id), "Scan retry requested.");
  };

  if (loading) return <LoadingState />;
  if (error || !scan) {
    return <ErrorState message={error || "Scan not found."} />;
  }

  const isActive = ACTIVE_STATUSES.includes(scan.status);
  const canRetry = RETRYABLE_SCAN_STATUSES.includes(scan.status);
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
    : engineResults.map((engineResult) => ({
        engine: engineResult.engine,
        status: engineResult.status,
        findings_count: engineResult.findings_count,
        skipped_reason: engineResult.skipped_reason,
      }));

  return (
    <div>
      <div className="breadcrumb">
        <Link to="/scans">Scans</Link>
        <span className="sep">/</span>
        <span className="current">{scan.id.slice(0, 8)}…</span>
      </div>

      <button className="btn-secondary mb-4" onClick={() => navigate(-1)}>
        ← Back
      </button>

      {actionMessage && (
        <div className="alert alert-info mb-4" role="status">
          <span>ℹ️</span>
          <span>{actionMessage}</span>
        </div>
      )}

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
        <div className="flex gap-3" style={{ flexWrap: "wrap" }}>
          {scan.status === "pending" && (
            <button
              className="btn-primary"
              onClick={handleStart}
              disabled={actionLoading}
            >
              {actionLoading ? "Starting…" : "▶ Start Scan"}
            </button>
          )}
          {canRetry && (
            <button
              className="btn-secondary"
              onClick={handleRetry}
              disabled={actionLoading}
            >
              {actionLoading ? "Retrying…" : "↻ Retry Scan"}
            </button>
          )}
        </div>
      </div>

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
            {findingsSoFar ?? 0} finding{findingsSoFar === 1 ? "" : "s"} so far
            {elapsedSeconds != null && ` · ${elapsedSeconds}s elapsed`}
          </p>
        </div>
      )}

      <div className="grid grid-4 gap-4 mb-6">
        {(["critical", "high", "medium", "low"] as const).map((severity) => (
          <div key={severity} className="stat-card">
            <SeverityBadge value={severity} />
            <div
              className="stat-value"
              style={{ fontSize: "1.6rem", marginTop: 8 }}
            >
              {scan.finding_counts[severity]}
            </div>
          </div>
        ))}
      </div>

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
              {engines.map((engine, index) => {
                const detail = engineResults.find(
                  (engineResult) => engineResult.engine === engine.engine,
                );
                return (
                  <tr key={`${engine.engine}-${index}`}>
                    <td>
                      <span className="badge badge-info">
                        {String(engine.engine).toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <EngineStatusBadge value={engine.status} />
                    </td>
                    <td className="text-sm">{engine.findings_count ?? 0}</td>
                    <td className="text-muted text-xs">
                      {detail?.duration_seconds != null
                        ? `${detail.duration_seconds}s`
                        : "—"}
                    </td>
                    <td className="text-muted text-xs">
                      {engine.status === "skipped"
                        ? (engine.skipped_reason ??
                          detail?.skipped_reason ??
                          "—")
                        : detail?.error_message || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {scan.bypass_quality_gate ? (
        <div className="alert alert-warning mb-6">
          <span>⚠️</span>
          <span>
            Quality gate bypassed:
            {scan.bypass_reason
              ? ` ${scan.bypass_reason}`
              : " No reason provided."}
          </span>
        </div>
      ) : scan.quality_gate_passed !== null ? (
        <div
          className={`alert ${scan.quality_gate_passed ? "alert-success" : "alert-error"} mb-6`}
        >
          <span>{scan.quality_gate_passed ? "✅" : "❌"}</span>
          <span>
            Quality gate:{" "}
            <strong>{scan.quality_gate_passed ? "PASSED" : "FAILED"}</strong>
          </span>
        </div>
      ) : (
        scan.status !== "pending" &&
        !["queued", "running"].includes(scan.status) &&
        !scan.status.startsWith("running_") && (
          <div className="alert alert-info mb-6">
            <span>ℹ️</span>
            <span>
              No quality gate policy is attached to this scan — findings were
              recorded but not evaluated against pass/fail thresholds.{" "}
              <Link
                to="/scan-policies"
                style={{ color: "var(--gw-indigo)", fontWeight: 600 }}
              >
                Configure a policy
              </Link>{" "}
              to enforce one.
            </span>
          </div>
        )
      )}

      {scan.error_message && (
        <div className="alert alert-error mb-6">
          <span>⚠️</span>
          <span>{scan.error_message}</span>
        </div>
      )}

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
              {findings.map((finding) => (
                <tr key={finding.id}>
                  <td>
                    <SeverityBadge value={finding.severity} />
                  </td>
                  <td className="text-sm" style={{ maxWidth: 280 }}>
                    {finding.title}
                  </td>
                  <td>
                    <span className="badge badge-info">
                      {finding.scanner_type || "—"}
                    </span>
                  </td>
                  <td className="text-muted text-xs">
                    {finding.cwe_id || "—"}
                  </td>
                  <td className="text-muted text-xs">
                    {finding.owasp_category || "—"}
                  </td>
                  <td>
                    <FindingStatusBadge value={finding.status} />
                  </td>
                  <td>
                    <Link
                      to={`/findings/${finding.id}`}
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
