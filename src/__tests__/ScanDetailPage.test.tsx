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

const currentScan = vi.hoisted(() => ({
  id: "scan-123",
  organization: "org-1",
  project: "proj-1",
  repository: null,
  policy: null,
  scan_type: "full",
  branch: "main",
  commit_sha: "",
  status: "running_sast",
  triggered_by: null,
  triggered_by_detail: null,
  started_at: new Date().toISOString(),
  completed_at: null,
  duration_seconds: null,
  error_message: "",
  scanner_metadata: {},
  quality_gate_passed: null,
  bypass_quality_gate: false,
  bypass_reason: "",
  finding_counts: {
    critical: 0,
    high: 1,
    medium: 2,
    low: 0,
    info: 0,
    total: 3,
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  progress: 42,
}));

const currentProgress = vi.hoisted(() => ({
  id: "scan-123",
  status: "running_sast",
  progress: 42,
  elapsed_seconds: 17,
  findings_count: 3,
  engines: [
    { engine: "sast", status: "running", findings_count: 2 },
    { engine: "secrets", status: "completed", findings_count: 1 },
    {
      engine: "container",
      status: "skipped",
      findings_count: 0,
      skipped_reason: "docker_image not provided",
    },
  ],
}));

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
      status: "running_sast",
      duration_seconds: null,
      progress: 42,
      quality_gate_passed: null,
      bypass_quality_gate: false,
      bypass_reason: "",
      error_message: "",
    });

    Object.assign(currentProgress, {
      status: "running_sast",
      progress: 42,
      elapsed_seconds: 17,
      findings_count: 3,
      engines: [
        { engine: "sast", status: "running", findings_count: 2 },
        { engine: "secrets", status: "completed", findings_count: 1 },
        {
          engine: "container",
          status: "skipped",
          findings_count: 0,
          skipped_reason: "docker_image not provided",
        },
      ],
    });

    mockScans.get.mockResolvedValue({ data: currentScan });
    mockScans.start.mockResolvedValue({ data: {} });
    mockScans.retry.mockResolvedValue({ data: {} });
    mockScans.progress.mockResolvedValue({ data: currentProgress });
    mockScans.engineResults.mockResolvedValue({ data: [] });
    mockFindings.list.mockResolvedValue({ data: [] });
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

  it("renders progress bar and engine statuses from the progress endpoint", async () => {
    renderPage();

    await waitFor(() => screen.getByText("Scan Detail"));
    await waitFor(() => screen.getByText("Engines"));

    expect(screen.getByText("42%")).toBeInTheDocument();
    expect(screen.getByText("SAST")).toBeInTheDocument();
    expect(screen.getByText("SECRETS")).toBeInTheDocument();
    expect(screen.getByText("CONTAINER")).toBeInTheDocument();
    expect(screen.getByText("docker_image not provided")).toBeInTheDocument();
  });

  it("renders a retry button for failed scans and calls retry", async () => {
    currentScan.status = "failed";
    currentProgress.status = "failed";

    renderPage();

    const retryButton = await screen.findByRole("button", {
      name: /retry scan/i,
    });
    await userEvent.click(retryButton);

    expect(mockScans.retry).toHaveBeenCalledWith("scan-123");
    await waitFor(() => {
      expect(screen.getByText("Scan retry requested.")).toBeInTheDocument();
    });
  });
});
