// Severity / status badge helper components — mirrors gw-frontend .status-badge
import type {
  Severity,
  ScanStatus,
  FindingStatus,
  GitIntegrationStatus,
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
  running: "badge badge-running",
  completed: "badge badge-completed",
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
