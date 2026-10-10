// ─── Shared ────────────────────────────────────────────────────────────────

export type Role =
  "owner" | "admin" | "security_engineer" | "developer" | "auditor";
export type ScanType =
  "sast" | "dast" | "sca" | "secrets" | "iac" | "container" | "api" | "full";
export type ScanStatus =
  | "pending"
  | "queued"
  | "worker_claimed"
  | "cloning"
  | "running"
  | "running_sast"
  | "running_sca"
  | "running_secrets"
  | "running_iac"
  | "running_container"
  | "running_api"
  | "running_dast"
  | "normalizing"
  | "completed"
  | "completed_with_warnings"
  | "completed_partial"
  | "failed"
  | "cancelled";
export type EngineStatus =
  "pending" | "running" | "completed" | "skipped" | "failed";
export type ReportType =
  | "security_summary"
  | "executive_summary"
  | "developer_remediation"
  | "owasp_top10"
  | "cwe_top25"
  | "quality_gate";
export type Severity = "critical" | "high" | "medium" | "low" | "info";
export type Confidence = "very_high" | "high" | "medium" | "low";
export type FindingStatus =
  "open" | "fixed" | "accepted_risk" | "false_positive" | "ignored";
export type GitProvider = "github" | "gitlab" | "bitbucket" | "azure_devops";
export type AuthType =
  "public" | "personal_access_token" | "oauth" | "github_app";
export type GitIntegrationStatus = "active" | "expired" | "revoked" | "error";
export type Visibility = "public" | "private" | "internal";
export type AccessMode = "public" | "integration" | "local_path";
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
  local_path: string;
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
  max_medium: number;
  fail_on_secrets: boolean;
  fail_on_new_findings_only: boolean;
  allow_accepted_risks: boolean;
  allow_false_positives: boolean;
  schedule_cron: string;
  is_active: boolean;
  is_default: boolean;
  created_by: number | null;
  created_by_detail: MinimalUser | null;
  created_at: string;
  updated_at: string;
}

export interface ScanPolicyTemplate {
  id: string;
  key: string;
  name: string;
  description: string;
  recommended_for: string;
  scan_types: ScanType[];
  fail_on_severity: Severity;
  max_critical: number;
  max_high: number;
  max_medium: number;
  fail_on_secrets: boolean;
  fail_on_new_findings_only: boolean;
  allow_accepted_risks: boolean;
  allow_false_positives: boolean;
  is_recommended: boolean;
  is_active: boolean;
  sort_order: number;
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
  bypass_quality_gate?: boolean;
  bypass_reason?: string;
  can_retry?: boolean;
  finding_counts: FindingCounts;
  // Production scanning fields (see gw-backend feature/securewise-production-scans)
  progress?: number;
  selected_engines?: string[];
  target_url?: string;
  api_spec_url?: string;
  docker_image?: string;
  created_at: string;
  updated_at: string;
}

export interface ScanDiagnostics {
  log_excerpt?: string;
  stage?: string;
  root_cause?: string;
  retryable?: boolean;
  mode?: string;
  execution_mode?: string;
  coverage?: Record<string, unknown>;
}

// ─── Scan Engine Result ────────────────────────────────────────────────────

export interface ScanEngineResult {
  id: string;
  engine: ScanType | string;
  status: EngineStatus;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  findings_count: number;
  skipped_reason: string;
  error_message: string;
  diagnostics?: ScanDiagnostics;
  raw_summary?: Record<string, unknown>;
}

// ─── Scan Progress ─────────────────────────────────────────────────────────

export interface ScanProgress {
  id: string;
  status: ScanStatus;
  progress: number;
  elapsed_seconds: number;
  findings_count: number;
  coverage?: {
    requested_engines: number;
    completed_engines: number;
    skipped_engines: number;
    failed_engines: number;
    total_findings: number;
  };
  worker_readiness?: {
    worker_available: boolean;
    docker_ready: boolean;
    trivy_available: boolean;
    zap_available: boolean;
    worker_id: string;
    last_seen_at: string | null;
    diagnostics: string[];
  };
  engines: Array<{
    engine: ScanType | string;
    status: EngineStatus;
    findings_count: number;
    skipped_reason?: string;
    diagnostics?: Pick<ScanDiagnostics, "log_excerpt">;
  }>;
}

export type PentestOutcome =
  | "planned"
  | "confirmed_vulnerability"
  | "suspected_vulnerability"
  | "inconclusive"
  | "passed"
  | "not_executed";

export interface PentestEvidence {
  id: number;
  kind: string;
  content: Record<string, unknown>;
  sha256: string;
  created_at: string;
}

export interface PentestExecution {
  id: number;
  outcome: PentestOutcome;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  summary: string;
  error_message: string;
  evidence: PentestEvidence[];
}

export interface PentestTestCase {
  id: number;
  test_key: string;
  title: string;
  category: string;
  endpoint: string;
  method: string;
  expected_behavior: string;
  status: PentestOutcome;
  severity: Severity;
  confidence: Confidence;
  cwe_id: string;
  owasp_category: string;
  recommendation: string;
  source: string;
  executions: PentestExecution[];
}

export interface PentestTestProposal {
  id: string;
  proposal_key: string;
  test_type: string;
  title: string;
  endpoint: string;
  method: string;
  required_role: string;
  expected_property: string;
  safe_method: string;
  required_test_data: Record<string, unknown>;
  estimated_cost: {
    read_only_requests: number;
    browser_journeys: number;
    provider_cost_usd: number;
    worker_compute_cost: string;
  };
  parameter_schema: Record<
    string,
    | { type: "enum"; values: Array<string | number | boolean> }
    | { type: "integer" | "boolean" }
  >;
  safe_parameters: Record<string, string | number | boolean>;
  cwe_id: string;
  owasp_category: string;
  severity: Severity;
  confidence: Confidence;
  rationale: string;
  limitations: string;
  execution_mode: string;
  executable: boolean;
  approval_status:
    "pending" | "approved" | "rejected" | "unsupported" | "executed";
  source: string;
  test_case: number | null;
}

export interface PentestRetestComparison {
  baseline_session_id: string;
  baseline_cases: number;
  retest_cases: number;
  fixed: string[];
  still_confirmed: string[];
  suspected: string[];
  newly_confirmed: string[];
  not_retested: string[];
}

export interface PentestSession {
  id: string;
  organization: string;
  project: string;
  repository: string;
  retest_of: string | null;
  unified_scan: string | null;
  authorization_confirmed: boolean;
  authorization_reference: string;
  mode:
    | "passive"
    | "authenticated_api"
    | "authenticated_browser"
    | "security_planning"
    | "approved_tests";
  status:
    | "pending"
    | "queued"
    | "worker_claimed"
    | "running"
    | "completed"
    | "completed_with_warnings"
    | "failed"
    | "cancelled";
  progress: number;
  scope: Array<{ scheme: "http" | "https"; host: string; port: number }>;
  test_cases: PentestTestCase[];
  proposals: PentestTestProposal[];
  security_inventory: Record<string, unknown>;
  coverage: Record<string, number>;
  retest_comparison?: PentestRetestComparison | null;
  error_message: string;
  timeout_seconds: number;
  requests_per_minute: number;
  started_at: string | null;
  completed_at: string | null;
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
  code_snippet?: string;
  evidence: Record<string, unknown>;
  fingerprint: string;
  ai_fix_suggestion: string;
  ticket_url: string;
  ticket_created_at: string | null;
  pr_url: string;
  pr_created_at: string | null;
  reviewed_by: number | null;
  reviewed_by_detail: MinimalUser | null;
  reviewed_at: string | null;
  review_note: string;
  created_at: string;
  updated_at: string;
}

export interface AIFixSuggestion {
  explanation: string;
  why_dangerous: string;
  fixed_code_example: string;
  framework_guidance: string;
  confidence: "low" | "medium" | "high";
}

export interface FindingAiSuggestionResponse {
  ai_fix_suggestion: AIFixSuggestion | null;
  cached: boolean;
  engine_unavailable?: boolean;
  detail?: string;
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
  owasp_top10_coverage: Record<string, number>;
  cwe_ids_covered: string[];
  cwe_coverage: string[];
  security_taxonomy: {
    dataset_version: string;
    cwe_top25_edition: string;
    owasp_edition: string;
    cwe_source: string;
  };
  quality_gate_counts: {
    passed: number;
    failed: number;
  };
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
