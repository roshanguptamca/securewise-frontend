// ─── Shared ────────────────────────────────────────────────────────────────

export type Role =
  "owner" | "admin" | "security_engineer" | "developer" | "auditor";
export type ScanType =
  "sast" | "dast" | "sca" | "secrets" | "iac" | "container" | "api" | "full";
export type ScanStatus =
  "pending" | "queued" | "running" | "completed" | "failed" | "cancelled";
export type Severity = "critical" | "high" | "medium" | "low" | "info";
export type Confidence = "very_high" | "high" | "medium" | "low";
export type FindingStatus =
  "open" | "fixed" | "accepted_risk" | "false_positive" | "ignored";
export type GitProvider = "github" | "gitlab" | "bitbucket" | "azure_devops";
export type AuthType =
  "public" | "personal_access_token" | "oauth" | "github_app";
export type GitIntegrationStatus = "active" | "expired" | "revoked" | "error";
export type Visibility = "public" | "private" | "internal";
export type AccessMode = "public" | "integration";
export type LastAccessStatus =
  "accessible" | "forbidden" | "not_found" | "error";

export interface MinimalUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

// ─── Organization ──────────────────────────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string;
  website: string;
  logo_url: string;
  is_active: boolean;
  owner: number | null;
  owner_detail: MinimalUser | null;
  member_count: number;
  created_at: string;
  updated_at: string;
}

export interface Membership {
  id: string;
  organization: string;
  user: number;
  user_detail: MinimalUser;
  role: Role;
  invited_by: number | null;
  created_at: string;
}

// ─── Git Integration ───────────────────────────────────────────────────────

export interface GitIntegration {
  id: string;
  organization: string;
  provider: GitProvider;
  auth_type: AuthType;
  name: string;
  base_url: string;
  token_last_four: string;
  scopes: string[];
  connected_by: number | null;
  connected_by_detail: MinimalUser | null;
  connected_at: string;
  last_used_at: string | null;
  status: GitIntegrationStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ─── Project ───────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  organization: string;
  name: string;
  slug: string;
  description: string;
  tags: string[];
  risk_level: Severity;
  is_active: boolean;
  created_by: number | null;
  created_by_detail: MinimalUser | null;
  scan_count: number;
  open_findings_count: number;
  created_at: string;
  updated_at: string;
}

// ─── Repository ────────────────────────────────────────────────────────────

export interface Repository {
  id: string;
  organization: string;
  project: string | null;
  integration: string | null;
  name: string;
  provider: GitProvider | "";
  repository_url: string;
  clone_url: string;
  default_branch: string;
  visibility: Visibility;
  access_mode: AccessMode;
  last_access_check_at: string | null;
  last_access_status: LastAccessStatus | "";
  created_by: number | null;
  created_by_detail: MinimalUser | null;
  created_at: string;
  updated_at: string;
}

// ─── Scan Policy ───────────────────────────────────────────────────────────

export interface ScanPolicy {
  id: string;
  organization: string;
  project: string | null;
  name: string;
  description: string;
  scan_types: ScanType[];
  fail_on_severity: Severity;
  max_critical: number;
  max_high: number;
  schedule_cron: string;
  is_active: boolean;
  created_by: number | null;
  created_by_detail: MinimalUser | null;
  created_at: string;
  updated_at: string;
}

// ─── Scan ──────────────────────────────────────────────────────────────────

export interface FindingCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  total: number;
}

export interface Scan {
  id: string;
  organization: string;
  project: string;
  repository: string | null;
  policy: string | null;
  scan_type: ScanType;
  branch: string;
  commit_sha: string;
  status: ScanStatus;
  triggered_by: number | null;
  triggered_by_detail: MinimalUser | null;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  error_message: string;
  scanner_metadata: Record<string, unknown>;
  quality_gate_passed: boolean | null;
  finding_counts: FindingCounts;
  created_at: string;
  updated_at: string;
}

// ─── Finding ───────────────────────────────────────────────────────────────

export interface Finding {
  id: string;
  scan: string;
  project: string;
  organization: string;
  title: string;
  description: string;
  file_path: string;
  line_number: number | null;
  endpoint: string;
  cwe_id: string;
  owasp_category: string;
  scanner_type: ScanType | "";
  severity: Severity;
  confidence: Confidence;
  status: FindingStatus;
  risk: string;
  impact: string;
  recommendation: string;
  bad_code_example: string;
  fixed_code_example: string;
  evidence: Record<string, unknown>;
  fingerprint: string;
  ai_fix_suggestion: string;
  reviewed_by: number | null;
  reviewed_by_detail: MinimalUser | null;
  reviewed_at: string | null;
  review_note: string;
  created_at: string;
  updated_at: string;
}

// ─── Report ────────────────────────────────────────────────────────────────

export interface Report {
  id: string;
  organization: string;
  project: string;
  scan: string | null;
  title: string;
  format: "json" | "html" | "pdf";
  status: "generating" | "ready" | "failed";
  report_data: Record<string, unknown>;
  quality_gate_passed: boolean | null;
  generated_by: number | null;
  generated_by_detail: MinimalUser | null;
  created_at: string;
  updated_at: string;
}

// ─── Integration ───────────────────────────────────────────────────────────

export interface Integration {
  id: string;
  organization: string;
  integration_type: string;
  name: string;
  config: Record<string, unknown>;
  is_active: boolean;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

// ─── Audit Log ─────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  organization: string | null;
  user: number | null;
  user_detail: MinimalUser | null;
  event: string;
  target_type: string;
  target_id: string;
  detail: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

// ─── Dashboard ─────────────────────────────────────────────────────────────

export interface DashboardSummary {
  total_projects: number;
  total_scans: number;
  open_findings: number;
  critical_high_count: number;
  security_score: number;
  severity_counts: Record<Severity, number>;
  recent_scans: Scan[];
  top_risky_projects: Array<{
    project__id: string;
    project__name: string;
    risk_count: number;
  }>;
}

// ─── API list response ─────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
