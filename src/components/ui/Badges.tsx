// Severity / status badge helper components — mirrors gw-frontend .status-badge
import type {
  Severity,
  ScanStatus,
  FindingStatus,
  GitIntegrationStatus,
  EngineStatus,
} from "../../types";

const SEV_CLASS: Record<Severity, string> = {
  critical: "badge badge-critical",
  high: "badge badge-high",
  medium: "badge badge-medium",
  low: "badge badge-low",
  info: "badge badge-info",
};

const SCAN_STATUS_CLASS: Record<ScanStatus, string> = {
  pending: "badge badge-pending",
  queued: "badge badge-queued",
  cloning: "badge badge-cloning",
  running: "badge badge-running",
  running_sast: "badge badge-running_sast",
  running_sca: "badge badge-running_sca",
  running_secrets: "badge badge-running_secrets",
  running_iac: "badge badge-running_iac",
  running_container: "badge badge-running_container",
  running_api: "badge badge-running_api",
  running_dast: "badge badge-running_dast",
  normalizing: "badge badge-normalizing",
  completed: "badge badge-completed",
  completed_with_warnings: "badge badge-completed_with_warnings",
  failed: "badge badge-failed",
  cancelled: "badge badge-cancelled",
};

const FINDING_STATUS_CLASS: Record<FindingStatus, string> = {
  open: "badge badge-open",
  fixed: "badge badge-fixed",
  accepted_risk: "badge badge-accepted-risk",
  false_positive: "badge badge-false-positive",
  ignored: "badge badge-ignored",
};

const GIT_STATUS_CLASS: Record<GitIntegrationStatus, string> = {
  active: "badge badge-completed",
  expired: "badge badge-cancelled",
  revoked: "badge badge-failed",
  error: "badge badge-failed",
};

const ENGINE_STATUS_CLASS: Record<EngineStatus, string> = {
  pending: "badge badge-pending",
  running: "badge badge-running",
  completed: "badge badge-completed",
  skipped: "badge badge-skipped",
  failed: "badge badge-failed",
};

export function SeverityBadge({ value }: { value: Severity }) {
  return <span className={SEV_CLASS[value] ?? "badge"}>{value}</span>;
}

export function ScanStatusBadge({ value }: { value: ScanStatus }) {
  return (
    <span className={SCAN_STATUS_CLASS[value] ?? "badge"}>
      {value === "running" && (
        <span
          className="spinner spinner-sm"
          style={{ display: "inline-block", marginRight: 4 }}
        />
      )}
      {value}
    </span>
  );
}

export function FindingStatusBadge({ value }: { value: FindingStatus }) {
  return (
    <span className={FINDING_STATUS_CLASS[value] ?? "badge"}>
      {value.replace("_", " ")}
    </span>
  );
}

export function GitStatusBadge({ value }: { value: GitIntegrationStatus }) {
  return <span className={GIT_STATUS_CLASS[value] ?? "badge"}>{value}</span>;
}

export function EngineStatusBadge({ value }: { value: EngineStatus }) {
  return (
    <span className={ENGINE_STATUS_CLASS[value] ?? "badge"}>
      {value === "running" && (
        <span
          className="spinner spinner-sm"
          style={{ display: "inline-block", marginRight: 4 }}
        />
      )}
      {value}
    </span>
  );
}
