import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Download, Play, RotateCcw } from "lucide-react";

import { sw } from "../../api/client";
import { ScanDiagnosticsPanel } from "../../components/scans/ScanDiagnosticsPanel";
import {
  EngineStatusBadge,
  FindingStatusBadge,
  ScanStatusBadge,
  SeverityBadge,
} from "../../components/ui/Badges";
import { ErrorState, LoadingState } from "../../components/ui/States";
import type {
  Finding,
  Scan,
  ScanDiagnostics,
  ScanEngineResult,
  ScanProgress,
} from "../../types";

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

function formatDateTime(value?: string | null): string {
  return value ? new Date(value).toLocaleString() : "Unknown";
}

function formatDuration(value?: number | null): string {
  return value != null ? `${value}s` : "N/A";
}

function humanize(value: string): string {
  return value.replace(/_/g, " ");
}

function engineLabel(engine: string): string {
  const labels: Record<string, string> = {
    sast: "SAST",
    sca: "SCA",
    secrets: "Secret scan",
    iac: "IaC scan",
    container: "Container scan",
    api: "API scan",
    dast: "DAST",
  };
  return labels[engine] ?? humanize(engine);
}

function displayList(value: unknown): string {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "None detected";
  }
  if (typeof value === "string" && value.trim()) return value;
  return "None detected";
}

function readDiscovery(scan: Scan): Record<string, unknown> {
  const metadata = scan.scanner_metadata;
  if (!metadata || typeof metadata !== "object") return {};
  const discovery = (metadata as Record<string, unknown>).discovery;
  return discovery && typeof discovery === "object"
    ? (discovery as Record<string, unknown>)
    : {};
}

function candidatePort(scan: Scan, discovery: Record<string, unknown>): string {
  const selectedRuntimeUrl = discovery.selected_runtime_url;
  if (typeof selectedRuntimeUrl === "string" && selectedRuntimeUrl) {
    try {
      const parsed = new URL(selectedRuntimeUrl);
      if (parsed.port) return parsed.port;
    } catch {
      // Ignore malformed URLs and fall back to candidate ports.
    }
  }
  const ports = discovery.candidate_ports;
  if (Array.isArray(ports) && ports.length > 0) return String(ports[0]);
  const exposedPorts = discovery.exposed_ports;
  if (Array.isArray(exposedPorts) && exposedPorts.length > 0) {
    return String(exposedPorts[0]);
  }
  const targetUrl = scan.target_url;
  if (targetUrl) {
    try {
      const parsed = new URL(targetUrl);
      return parsed.port || (parsed.protocol === "https:" ? "443" : "80");
    } catch {
      return "N/A";
    }
  }
  return "N/A";
}

function runtimeStrategy(discovery: Record<string, unknown>): string {
  if (discovery.has_docker_compose) return "docker-compose";
  if (discovery.has_dockerfile) return "Dockerfile";
  if (typeof discovery.start_command === "string" && discovery.start_command) {
    return "documented start command";
  }
  if (discovery.requires_runtime)
    return "runtime required but not auto-started";
  return "static-only";
}

function severityCounts(scan: Scan, findings: Finding[]) {
  const base = {
    critical: scan.finding_counts.critical,
    high: scan.finding_counts.high,
    medium: scan.finding_counts.medium,
    low: scan.finding_counts.low,
    info: scan.finding_counts.info,
    total: scan.finding_counts.total,
  };
  if (findings.length === 0) return base;
  const counts = { ...base };
  counts.total = findings.length;
  return counts;
}

function buildSuggestedAction(
  engine: string,
  diagnostics?: ScanDiagnostics,
  reason = "",
): string {
  const text =
    `${diagnostics?.stage ?? ""} ${diagnostics?.root_cause ?? ""} ${reason}`.toLowerCase();
  if (text.includes("docker build")) {
    return "Verify the Python or Node runtime version, dependency lock file, and Docker build context.";
  }
  if (text.includes("application startup") || text.includes("runtime")) {
    return "Check the start command, required environment variables, and exposed port.";
  }
  if (text.includes("zap")) {
    return "Install OWASP ZAP in the scan environment or keep the scan static-only.";
  }
  if (text.includes("library") || text.includes("cli")) {
    return "This repository was detected as a library or CLI project. Run static scans only or point SecureWise at a runnable web service.";
  }
  if (diagnostics?.root_cause) return diagnostics.root_cause;
  return (
    reason ||
    `Review the ${engineLabel(engine)} logs and retry after fixing the underlying issue.`
  );
}

function describeDastReason(reason: string): string {
  const text = reason.toLowerCase();
  if (
    text.includes("project_type is 'library'") ||
    text.includes("project_type is 'cli'")
  ) {
    return "DAST was not applicable because this repository was detected as a library or CLI project.";
  }
  if (
    text.includes("docker build failed") ||
    text.includes("application could not be auto-started")
  ) {
    return "DAST was not run because SecureWise could not start the application runtime.";
  }
  if (
    text.includes("zap") &&
    (text.includes("not installed") || text.includes("unavailable"))
  ) {
    return "DAST was skipped because OWASP ZAP is not installed or available in the scan environment.";
  }
  return reason;
}

function buildEngines(
  progress: ScanProgress | null,
  engineResults: ScanEngineResult[],
): Array<
  ScanProgress["engines"][number] &
    Partial<ScanEngineResult> & { diagnostics?: ScanDiagnostics }
> {
  const progressByName = new Map(
    (progress?.engines ?? []).map((row) => [row.engine, row]),
  );
  const resultsByName = new Map(engineResults.map((row) => [row.engine, row]));
  const names = new Set<string>([
    ...(progress?.engines ?? []).map((row) => String(row.engine)),
    ...engineResults.map((row) => String(row.engine)),
  ]);

  return Array.from(names).map((engine) => {
    const progressRow = progressByName.get(engine);
    const resultRow = resultsByName.get(engine);
    return {
      engine,
      status: progressRow?.status ?? resultRow?.status ?? "pending",
      findings_count:
        progressRow?.findings_count ?? resultRow?.findings_count ?? 0,
      skipped_reason:
        progressRow?.skipped_reason ?? resultRow?.skipped_reason ?? "",
      started_at: resultRow?.started_at ?? null,
      completed_at: resultRow?.completed_at ?? null,
      duration_seconds: resultRow?.duration_seconds ?? null,
      error_message: resultRow?.error_message ?? "",
      diagnostics: resultRow?.diagnostics ?? progressRow?.diagnostics,
      raw_summary: resultRow?.raw_summary,
    };
  });
}

function buildTimeline(
  scan: Scan,
  engines: ReturnType<typeof buildEngines>,
): Array<{ timestamp: string; title: string; detail: string }> {
  const events: Array<{ timestamp: string; title: string; detail: string }> =
    [];
  if (scan.created_at) {
    events.push({
      timestamp: scan.created_at,
      title: "Scan created",
      detail: scan.scan_type.toUpperCase(),
    });
  }
  if (scan.started_at) {
    events.push({
      timestamp: scan.started_at,
      title: "Scan started",
      detail: scan.status,
    });
  }

  engines.forEach((engine) => {
    if (engine.started_at) {
      events.push({
        timestamp: engine.started_at,
        title: `${engineLabel(String(engine.engine))} started`,
        detail: `Status: ${engine.status}`,
      });
    }
    if (engine.completed_at) {
      const reason =
        engine.status === "skipped"
          ? describeDastReason(
              engine.skipped_reason || engine.error_message || "",
            )
          : engine.status === "failed"
            ? engine.diagnostics?.root_cause || engine.error_message || "Failed"
            : `Findings: ${engine.findings_count ?? 0}`;
      events.push({
        timestamp: engine.completed_at,
        title: `${engineLabel(String(engine.engine))} ${engine.status}`,
        detail: reason,
      });
    }
  });

  if (scan.completed_at) {
    events.push({
      timestamp: scan.completed_at,
      title:
        scan.status === "completed_partial"
          ? "Scan completed with partial coverage"
          : "Scan completed",
      detail: `Status: ${scan.status}`,
    });
  }

  return events.sort(
    (a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime() ||
      a.title.localeCompare(b.title),
  );
}

function buildDiscoverySummary(scan: Scan) {
  const discovery = readDiscovery(scan);
  const primaryPort = candidatePort(scan, discovery);
  const healthEndpoints = Array.isArray(discovery.health_endpoints)
    ? discovery.health_endpoints.filter(
        (item): item is string => typeof item === "string",
      )
    : [];
  return [
    {
      label: "Project type",
      value: String(discovery.project_type ?? "unknown"),
    },
    { label: "Languages", value: displayList(discovery.detected_languages) },
    { label: "Frameworks", value: displayList(discovery.detected_frameworks) },
    {
      label: "Package manager",
      value: displayList(discovery.package_managers),
    },
    {
      label: "Application root",
      value: String(discovery.repository_path ?? "Repository root not exposed"),
    },
    { label: "Runtime strategy", value: runtimeStrategy(discovery) },
    {
      label: "Start command",
      value: String(discovery.start_command ?? "Not exposed"),
    },
    { label: "Detected port", value: primaryPort },
    {
      label: "Health endpoint",
      value: String(
        discovery.selected_health_endpoint ||
          healthEndpoints[0] ||
          "Not exposed",
      ),
    },
    {
      label: "OpenAPI spec",
      value: displayList(discovery.openapi_specs),
    },
    {
      label: "External services",
      value: displayList(discovery.external_services),
    },
    {
      label: "Auto-run confidence",
      value: `${Math.round((Number(discovery.confidence) || 0) * 100)}%`,
    },
  ];
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

  const load = useCallback(async () => {
    if (!id) return;
    setError("");
    try {
      const [scanResponse, findingsResponse] = await Promise.all([
        sw.scans.get(id),
        sw.findings.list({ scan: id }),
      ]);
      setScan(scanResponse.data);
      setFindings(findingsResponse.data.results ?? findingsResponse.data);
    } catch {
      setError("Failed to load scan.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadProgress = useCallback(async () => {
    if (!id) return;
    const [progressResult, engineResult] = await Promise.allSettled([
      sw.scans.progress(id),
      sw.scans.engineResults(id),
    ]);

    if (progressResult.status === "fulfilled") {
      setProgress(progressResult.value.data);
    }
    if (engineResult.status === "fulfilled") {
      setEngineResults(
        engineResult.value.data.results ?? engineResult.value.data,
      );
    }
  }, [id]);

  useEffect(() => {
    load();
    loadProgress();
  }, [load, loadProgress]);

  useEffect(() => {
    if (!scan || !ACTIVE_STATUSES.includes(scan.status)) return;
    const timer = window.setInterval(() => {
      load();
      loadProgress();
    }, POLL_INTERVAL);
    return () => window.clearInterval(timer);
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
      await Promise.all([load(), loadProgress()]);
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
    await runScanAction(() => sw.scans.retry(id), "Retry requested.");
  };

  const handleDownloadPartialReport = async () => {
    if (!scan || !id) return;
    await runScanAction(async () => {
      const title = `SecureWise partial report ${scan.id.slice(0, 8)}`;
      const reportResponse = await sw.reports.generate({
        organization: scan.organization,
        project: scan.project,
        scan: scan.id,
        title,
        format: "pdf",
        report_type: "security_summary",
      });
      const report = reportResponse.data;
      const pdfResponse = await sw.reports.pdf(report.id);
      const url = URL.createObjectURL(pdfResponse.data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${title.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "securewise-report"}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    }, "Partial report downloaded.");
  };

  if (loading) return <LoadingState />;
  if (error || !scan)
    return <ErrorState message={error || "Scan not found."} />;

  const isActive = ACTIVE_STATUSES.includes(scan.status);
  const canRetry =
    scan.can_retry ??
    [
      "failed",
      "cancelled",
      "completed_with_warnings",
      "completed",
      "completed_partial",
    ].includes(scan.status);
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
  const findingsSoFar =
    progress?.findings_count ?? scan.finding_counts?.total ?? 0;
  const engines = buildEngines(progress, engineResults);
  const discoverySummary = buildDiscoverySummary(scan);
  const timeline = buildTimeline(scan, engines);
  const failedEngines = engines.filter((row) => row.status === "failed");
  const skippedEngines = engines.filter((row) => row.status === "skipped");
  const completedEngines = engines.filter((row) => row.status === "completed");
  const primaryIssue =
    failedEngines[0] ??
    engines.find((row) => row.engine === "dast" && row.status === "skipped") ??
    engines.find((row) => row.engine === "dast" && row.status === "failed") ??
    null;
  const primaryDiagnostics = primaryIssue
    ? {
        log_excerpt:
          primaryIssue.diagnostics?.log_excerpt ||
          primaryIssue.error_message ||
          primaryIssue.skipped_reason ||
          scan.error_message ||
          "",
        stage:
          primaryIssue.diagnostics?.stage ||
          (primaryIssue.status === "skipped"
            ? primaryIssue.engine === "dast"
              ? "dast"
              : String(primaryIssue.engine)
            : String(primaryIssue.engine)),
        root_cause:
          primaryIssue.diagnostics?.root_cause ||
          primaryIssue.error_message ||
          primaryIssue.skipped_reason ||
          "",
        retryable:
          primaryIssue.diagnostics?.retryable ?? scan.can_retry ?? canRetry,
      }
    : null;
  const primarySummary = primaryIssue
    ? describeDastReason(
        primaryIssue.skipped_reason ||
          primaryIssue.error_message ||
          scan.error_message ||
          "",
      )
    : scan.error_message || "SecureWise could not finish the requested scan.";
  const runtimeBlockerMessage =
    primaryIssue?.engine === "dast"
      ? primarySummary
      : primarySummary ||
        "SecureWise could not auto-start the application runtime.";
  const suggestedAction = primaryIssue
    ? buildSuggestedAction(
        String(primaryIssue.engine),
        primaryDiagnostics ?? undefined,
        primarySummary,
      )
    : "Review the scan results and rerun once the runtime issue is resolved.";
  const retryLabel =
    scan.status === "completed_partial" || failedEngines.length > 0
      ? "Retry Failed Stages"
      : "Retry Scan";
  const partialCoverage = scan.status === "completed_partial";

  return (
    <div>
      <div className="breadcrumb">
        <Link to="/scans">Scans</Link>
        <span className="sep">/</span>
        <span className="current">{scan.id.slice(0, 8)}...</span>
      </div>

      <button className="btn-secondary mb-4" onClick={() => navigate(-1)}>
        {"<- Back"}
      </button>

      {actionMessage && (
        <div className="alert alert-info mb-4" role="status">
          <span>ℹ️</span>
          <span>{actionMessage}</span>
        </div>
      )}

      <div className="sw-page-header">
        <div>
          <div
            className="flex items-center gap-3 mb-1"
            style={{ flexWrap: "wrap" }}
          >
            <h1 className="sw-page-title">Scan Detail</h1>
            <ScanStatusBadge value={scan.status} />
            <span className="badge badge-info">
              {scan.scan_type.toUpperCase()}
            </span>
          </div>
          <p className="sw-page-subtitle">
            Triggered: {formatDateTime(scan.created_at)}
            {scan.duration_seconds != null
              ? ` - Duration: ${scan.duration_seconds}s`
              : elapsedSeconds != null && isActive
                ? ` - Elapsed: ${elapsedSeconds}s`
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
              <Play size={14} />
              {actionLoading ? "Starting..." : "Start Scan"}
            </button>
          )}
          {canRetry && (
            <button
              className="btn-secondary"
              onClick={handleRetry}
              disabled={actionLoading}
            >
              <RotateCcw size={14} />
              {actionLoading ? "Retrying..." : retryLabel}
            </button>
          )}
        </div>
      </div>

      {partialCoverage && (
        <div className="alert alert-warning mb-6">
          <span>⚠️</span>
          <div style={{ display: "grid", gap: 8, width: "100%" }}>
            <div>
              <strong>Scan completed with partial coverage.</strong>
            </div>
            <div className="text-sm">
              Completed engines: {completedEngines.length}. Skipped engines:{" "}
              {skippedEngines.length}. Failed engines: {failedEngines.length}.
              Findings produced: {findingsSoFar}.
            </div>
            <div className="text-sm">
              Runtime testing was incomplete because {runtimeBlockerMessage}
            </div>
            <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
              {canRetry && (
                <button
                  className="btn-secondary"
                  onClick={handleRetry}
                  disabled={actionLoading}
                >
                  <RotateCcw size={14} />
                  Retry Failed Stages
                </button>
              )}
              <a className="btn-secondary" href="#findings">
                View completed findings
              </a>
              <button
                className="btn-secondary"
                onClick={handleDownloadPartialReport}
                disabled={actionLoading}
              >
                <Download size={14} />
                Download partial report
              </button>
            </div>
          </div>
        </div>
      )}

      {isActive && (
        <div className="glass-card mb-6" style={{ padding: "1.25rem" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">
              Scan in progress ({humanize(scan.status)})
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
            {findingsSoFar} finding{findingsSoFar === 1 ? "" : "s"} so far
            {elapsedSeconds != null && ` - ${elapsedSeconds}s elapsed`}
          </p>
        </div>
      )}

      {(primaryIssue || partialCoverage) && (
        <div className="mb-6">
          <ScanDiagnosticsPanel
            title={
              primaryDiagnostics?.stage
                ? `${humanize(primaryDiagnostics.stage)}`
                : primaryIssue?.status === "skipped" &&
                    primaryIssue.engine === "dast"
                  ? "DAST skipped"
                  : "Scan diagnostics"
            }
            summary={primarySummary}
            diagnostics={primaryDiagnostics}
            retryable={primaryDiagnostics?.retryable ?? canRetry}
            suggestedAction={suggestedAction}
          />
        </div>
      )}

      <div
        className="grid gap-4 mb-6"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}
      >
        {(["critical", "high", "medium", "low"] as const).map((severity) => (
          <div key={severity} className="stat-card">
            <SeverityBadge value={severity} />
            <div
              className="stat-value"
              style={{ fontSize: "1.6rem", marginTop: 8 }}
            >
              {severityCounts(scan, findings)[severity]}
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card mb-6" style={{ padding: "1.25rem" }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 style={{ fontSize: "0.95rem", fontWeight: 700 }}>
              Discovery summary
            </h2>
            <p className="text-xs text-muted">
              Fields surfaced from the backend discovery and runtime planning
              metadata.
            </p>
          </div>
          <span className="badge badge-info">
            {Math.round((Number(readDiscovery(scan).confidence) || 0) * 100)}%
          </span>
        </div>
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          {discoverySummary.map((item) => (
            <div
              key={item.label}
              className="glass-card-sm"
              style={{ padding: "0.9rem 1rem" }}
            >
              <div className="text-xs text-muted mb-1">{item.label}</div>
              <div className="text-sm text-primary">{item.value}</div>
            </div>
          ))}
        </div>
      </div>

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
              <th>Started</th>
              <th>Completed</th>
              <th>Duration</th>
              <th>Findings</th>
              <th>Skipped reason</th>
              <th>Failure reason</th>
            </tr>
          </thead>
          <tbody>
            {engines.map((engine, index) => {
              const skippedReason =
                engine.status === "skipped"
                  ? describeDastReason(engine.skipped_reason || "")
                  : engine.skipped_reason || "N/A";
              const failureReason =
                engine.status === "failed"
                  ? engine.diagnostics?.root_cause ||
                    engine.error_message ||
                    "N/A"
                  : engine.status === "skipped"
                    ? engine.diagnostics?.root_cause || "N/A"
                    : "N/A";
              return (
                <tr key={`${engine.engine}-${index}`}>
                  <td>
                    <span className="badge badge-info">
                      {engineLabel(String(engine.engine)).toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <EngineStatusBadge value={engine.status} />
                  </td>
                  <td className="text-muted text-xs">
                    {formatDateTime(engine.started_at)}
                  </td>
                  <td className="text-muted text-xs">
                    {formatDateTime(engine.completed_at)}
                  </td>
                  <td className="text-muted text-xs">
                    {formatDuration(engine.duration_seconds)}
                  </td>
                  <td className="text-sm">{engine.findings_count ?? 0}</td>
                  <td
                    className="text-muted text-xs"
                    style={{ maxWidth: 280, whiteSpace: "normal" }}
                  >
                    {skippedReason}
                  </td>
                  <td
                    className="text-muted text-xs"
                    style={{ maxWidth: 280, whiteSpace: "normal" }}
                  >
                    {failureReason}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="glass-card mb-6" style={{ padding: "1.25rem" }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 style={{ fontSize: "0.95rem", fontWeight: 700 }}>
              Scan timeline
            </h2>
            <p className="text-xs text-muted">
              Events use the timestamps returned by the backend.
            </p>
          </div>
          <span className="badge badge-info">{timeline.length} events</span>
        </div>
        {timeline.length > 0 ? (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "grid",
              gap: 10,
            }}
          >
            {timeline.map((event) => (
              <li
                key={`${event.timestamp}-${event.title}`}
                className="glass-card-sm"
                style={{ padding: "0.9rem 1rem" }}
              >
                <div
                  className="flex items-start justify-between"
                  style={{ gap: 12 }}
                >
                  <div>
                    <div className="text-sm text-primary font-semibold">
                      {event.title}
                    </div>
                    <div className="text-xs text-muted">{event.detail}</div>
                  </div>
                  <div
                    className="text-xs text-muted"
                    style={{ whiteSpace: "nowrap" }}
                  >
                    {formatDateTime(event.timestamp)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="alert alert-info">
            <span>ℹ️</span>
            <span>No timeline events are available yet.</span>
          </div>
        )}
      </div>

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
              No quality gate policy is attached to this scan - findings were
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

      {scan.error_message && !primaryIssue && (
        <div className="alert alert-error mb-6">
          <span>⚠️</span>
          <span>{scan.error_message}</span>
        </div>
      )}

      {findings.length > 0 ? (
        <div
          id="findings"
          className="glass-card"
          style={{ overflow: "hidden" }}
        >
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
                      {finding.scanner_type || "N/A"}
                    </span>
                  </td>
                  <td className="text-muted text-xs">
                    {finding.cwe_id || "N/A"}
                  </td>
                  <td className="text-muted text-xs">
                    {finding.owasp_category || "N/A"}
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
      ) : (
        <div className="glass-card" style={{ padding: "1.25rem" }}>
          <div className="alert alert-info">
            <span>ℹ️</span>
            <span>No findings were recorded for this scan.</span>
          </div>
        </div>
      )}
    </div>
  );
}
