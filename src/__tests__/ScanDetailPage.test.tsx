import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const mockScans = vi.hoisted(() => ({
  get: vi.fn(),
  start: vi.fn(),
  retry: vi.fn(),
  progress: vi.fn(),
  engineResults: vi.fn(),
}));

const mockFindings = vi.hoisted(() => ({
  list: vi.fn(),
}));

const currentScan = vi.hoisted(() => {
  const now = "2026-07-11T00:00:00.000Z";
  return {
    id: "scan-123",
    organization: "org-1",
    project: "proj-1",
    repository: null,
    policy: null,
    scan_type: "full",
    branch: "main",
    commit_sha: "",
    status: "completed_partial",
    triggered_by: null,
    triggered_by_detail: null,
    started_at: now,
    completed_at: now,
    duration_seconds: 83,
    error_message: "",
    scanner_metadata: {
      discovery: {
        project_type: "web_app",
        detected_languages: ["python"],
        detected_frameworks: ["django"],
        package_managers: ["poetry"],
        dependency_files: ["pyproject.toml"],
        repository_path: "/workspace/de-voucher",
        has_dockerfile: true,
        dockerfile_path: "Dockerfile",
        requires_runtime: true,
        can_auto_run: true,
        start_command: "python manage.py runserver 0.0.0.0:8000",
        candidate_ports: [8000, 8080],
        health_endpoints: ["/health", "/"],
        selected_health_endpoint: "/health",
        openapi_specs: ["openapi.yaml"],
        external_services: ["postgresql"],
        confidence: 0.92,
        selected_runtime_url: "http://127.0.0.1:49152",
      },
    },
    quality_gate_passed: null,
    bypass_quality_gate: false,
    bypass_reason: "",
    can_retry: true,
    finding_counts: {
      critical: 0,
      high: 1,
      medium: 0,
      low: 0,
      info: 0,
      total: 1,
    },
    created_at: now,
    updated_at: now,
    progress: 100,
  };
});

const currentProgress = vi.hoisted(() => {
  return {
    id: "scan-123",
    status: "completed_partial",
    progress: 100,
    elapsed_seconds: 83,
    findings_count: 1,
    engines: [
      {
        engine: "sast",
        status: "completed",
        findings_count: 1,
        diagnostics: { log_excerpt: "Semgrep completed successfully." },
      },
      {
        engine: "dast",
        status: "skipped",
        findings_count: 0,
        skipped_reason: "Docker build failed; container scan skipped",
        diagnostics: {
          log_excerpt:
            "Application could not be auto-started because the Docker build failed.\nPoetry dependency installation failed.",
        },
      },
    ],
  };
});

const currentEngineResults = vi.hoisted(() => {
  const now = "2026-07-11T00:00:00.000Z";
  return [
    {
      id: "engine-1",
      engine: "sast",
      status: "completed",
      started_at: now,
      completed_at: now,
      duration_seconds: 11,
      findings_count: 1,
      skipped_reason: "",
      error_message: "",
      diagnostics: {
        log_excerpt: "Semgrep completed successfully.",
        stage: "sast",
        root_cause: "",
        retryable: false,
      },
      raw_summary: {},
    },
    {
      id: "engine-2",
      engine: "dast",
      status: "skipped",
      started_at: now,
      completed_at: now,
      duration_seconds: 3,
      findings_count: 0,
      skipped_reason: "Docker build failed; container scan skipped",
      error_message: "",
      diagnostics: {
        log_excerpt:
          "Application could not be auto-started because the Docker build failed.\nPoetry dependency installation failed.",
        stage: "docker_build_failed",
        root_cause: "Poetry dependency installation failed.",
        retryable: true,
      },
      raw_summary: {},
    },
  ];
});

const currentFindings = vi.hoisted(() => {
  const now = "2026-07-11T00:00:00.000Z";
  return [
    {
      id: "finding-1",
      scan: "scan-123",
      project: "proj-1",
      organization: "org-1",
      title: "SQL injection",
      description: "",
      file_path: "app/views.py",
      line_number: 12,
      endpoint: "",
      cwe_id: "CWE-89",
      owasp_category: "A03:2021",
      scanner_type: "sast",
      severity: "high",
      confidence: "high",
      status: "open",
      risk: "",
      impact: "",
      recommendation: "",
      bad_code_example: "",
      fixed_code_example: "",
      code_snippet: "",
      evidence: {},
      fingerprint: "fingerprint-1",
      ai_fix_suggestion: "",
      ticket_url: "",
      ticket_created_at: null,
      pr_url: "",
      pr_created_at: null,
      reviewed_by: null,
      reviewed_by_detail: null,
      reviewed_at: null,
      review_note: "",
      created_at: now,
      updated_at: now,
    },
  ];
});

vi.mock("../api/client", () => ({
  sw: {
    scans: mockScans,
    findings: mockFindings,
  },
}));

import ScanDetailPage from "../pages/scans/ScanDetailPage";

describe("ScanDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    Object.assign(currentScan, {
      status: "completed_partial",
      duration_seconds: 83,
      progress: 100,
      quality_gate_passed: null,
      bypass_quality_gate: false,
      bypass_reason: "",
      error_message: "",
      can_retry: true,
    });

    Object.assign(currentProgress, {
      status: "completed_partial",
      progress: 100,
      elapsed_seconds: 83,
      findings_count: 1,
    });

    mockScans.get.mockResolvedValue({ data: currentScan });
    mockScans.start.mockResolvedValue({ data: {} });
    mockScans.retry.mockResolvedValue({ data: {} });
    mockScans.progress.mockResolvedValue({ data: currentProgress });
    mockScans.engineResults.mockResolvedValue({ data: currentEngineResults });
    mockFindings.list.mockResolvedValue({ data: currentFindings });

    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  function renderPage() {
    render(
      <MemoryRouter initialEntries={["/scans/scan-123"]}>
        <Routes>
          <Route path="/scans/:id" element={<ScanDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it("shows partial coverage, diagnostics, and discovery data", async () => {
    renderPage();

    await waitFor(() => screen.getByText("Scan Detail"));
    expect(
      screen.getByText("Scan completed with partial coverage."),
    ).toBeInTheDocument();
    expect(screen.getByText("Project type")).toBeInTheDocument();
    expect(screen.getByText("web_app")).toBeInTheDocument();
    expect(screen.getByText("python")).toBeInTheDocument();
    expect(screen.getByText("django")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Completed engines: 1. Skipped engines: 1. Failed engines: 0. Findings produced: 1.",
      ),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { expanded: false }));
    expect(screen.getByText("Failed stage")).toBeInTheDocument();
    expect(screen.getByText("docker_build_failed")).toBeInTheDocument();
    expect(
      screen.getAllByText(/Poetry dependency installation failed\./i).length,
    ).toBeGreaterThan(0);
  });

  it("renders the retry button when the backend says the scan is retryable", async () => {
    renderPage();

    const retryButton = (
      await screen.findAllByRole("button", {
        name: /retry failed stages/i,
      })
    )[0];
    await userEvent.click(retryButton);

    expect(mockScans.retry).toHaveBeenCalledWith("scan-123");
    await waitFor(() => {
      expect(screen.getByText("Retry requested.")).toBeInTheDocument();
    });
  });

  it("hides retry when can_retry is false and keeps findings visible", async () => {
    currentScan.can_retry = false;

    renderPage();

    await waitFor(() => screen.getByText("SQL injection"));
    expect(
      screen.queryAllByRole("button", { name: /retry failed stages/i }),
    ).toHaveLength(0);
    expect(screen.getByText("SQL injection")).toBeInTheDocument();
    expect(
      screen.getAllByText(
        "DAST was not run because SecureWise could not start the application runtime.",
      ).length,
    ).toBeGreaterThan(0);
  });
});
