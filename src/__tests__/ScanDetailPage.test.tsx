/**
 * Tests for ScanDetailPage's real-time engine progress rendering:
 * verifies the progress bar and per-engine status list render when
 * progress data is present (from the new /scans/{id}/progress/ endpoint).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const mockScan = vi.hoisted(() => ({
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

const mockProgress = vi.hoisted(() => ({
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
    scans: {
      get: vi.fn().mockResolvedValue({ data: mockScan }),
      start: vi.fn().mockResolvedValue({ data: {} }),
      progress: vi.fn().mockResolvedValue({ data: mockProgress }),
      engineResults: vi.fn().mockResolvedValue({ data: [] }),
    },
    findings: {
      list: vi.fn().mockResolvedValue({ data: [] }),
    },
  },
}));

import ScanDetailPage from "../pages/scans/ScanDetailPage";

describe("ScanDetailPage engine progress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders progress bar and engine statuses from the progress endpoint", async () => {
    render(
      <MemoryRouter initialEntries={["/scans/scan-123"]}>
        <Routes>
          <Route path="/scans/:id" element={<ScanDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText("Scan Detail"));
    await waitFor(() => screen.getByText("Engines"));

    expect(screen.getByText("42%")).toBeInTheDocument();
    expect(screen.getByText("SAST")).toBeInTheDocument();
    expect(screen.getByText("SECRETS")).toBeInTheDocument();
    expect(screen.getByText("CONTAINER")).toBeInTheDocument();
    expect(screen.getByText("docker_image not provided")).toBeInTheDocument();
  });
});
