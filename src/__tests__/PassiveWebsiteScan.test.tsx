import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const mockScans = vi.hoisted(() => ({
  get: vi.fn(),
  create: vi.fn(),
  start: vi.fn(),
  cancel: vi.fn(),
  retry: vi.fn(),
  progress: vi.fn(),
  engineResults: vi.fn(),
}));
const mockFindings = vi.hoisted(() => ({ list: vi.fn() }));
const mockAuths = vi.hoisted(() => ({ list: vi.fn() }));

vi.mock("../api/client", () => ({
  sw: {
    scans: mockScans,
    findings: mockFindings,
    testingAuthorizations: mockAuths,
  },
}));

import ScanDetailPage from "../pages/scans/ScanDetailPage";
import { headerGuidance } from "../pages/scans/passiveWebsite";

const now = "2026-10-12T21:21:53.000Z";
const scan = {
  id: "scan-1",
  organization: "org-1",
  project: "proj-1",
  repository: null,
  policy: null,
  testing_authorization: "auth-1",
  scan_type: "dast",
  branch: "",
  commit_sha: "",
  status: "completed_partial",
  started_at: now,
  completed_at: now,
  duration_seconds: 0,
  error_message: "",
  scanner_metadata: {},
  quality_gate_passed: null,
  can_retry: true,
  target_url: "https://www.guidewisey.com/",
  finding_counts: {
    critical: 0,
    high: 0,
    medium: 3,
    low: 0,
    info: 0,
    total: 3,
  },
  created_at: now,
  updated_at: now,
  progress: 100,
};
const passiveSummary = {
  mode: "passive_only",
  raw_tool: "requests-passive-dast",
  execution_mode: "authorized_passive_http",
};
const engineRow = {
  id: "e1",
  engine: "dast",
  status: "completed",
  started_at: now,
  completed_at: now,
  duration_seconds: 0,
  findings_count: 3,
  skipped_reason: "",
  error_message: "",
  raw_summary: passiveSummary,
};
const activeAuth = {
  id: "auth-1",
  active: true,
  approved_scan_methods: ["passive_http"],
};

function renderPage() {
  render(
    <MemoryRouter initialEntries={["/scans/scan-1"]}>
      <Routes>
        <Route path="/scans/:id" element={<ScanDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Passive website scan presentation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockScans.get.mockResolvedValue({ data: scan });
    mockScans.progress.mockResolvedValue({
      data: {
        id: "scan-1",
        status: "completed_partial",
        progress: 100,
        findings_count: 3,
        engines: [{ engine: "dast", status: "completed", findings_count: 3 }],
      },
    });
    mockScans.engineResults.mockResolvedValue({ data: [engineRow] });
    mockFindings.list.mockResolvedValue({ data: [] });
    mockScans.create.mockResolvedValue({ data: { id: "scan-2" } });
    mockScans.start.mockResolvedValue({ data: {} });
    mockScans.cancel.mockResolvedValue({ data: {} });
    mockAuths.list.mockResolvedValue({ data: [activeAuth] });
  });

  it("explains completed_partial without implying failure or a full pentest", async () => {
    renderPage();

    await screen.findByRole("heading", {
      name: "Passive Website Security Check",
    });
    expect(
      screen.getByText(/not a full penetration test/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Why "completed partial"\?/)).toBeInTheDocument();
    expect(
      screen.queryByText("Scan completed with partial coverage."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /retry failed stages/i }),
    ).not.toBeInTheDocument();
  });

  it("retests with a new scan when the authorization is still active", async () => {
    renderPage();

    await userEvent.click(
      await screen.findByRole("button", { name: "Retest" }),
    );

    await waitFor(() => expect(mockScans.start).toHaveBeenCalledWith("scan-2"));
    expect(mockScans.create).toHaveBeenCalledWith(
      expect.objectContaining({
        scan_type: "dast",
        target_url: "https://www.guidewisey.com/",
        testing_authorization: "auth-1",
        selected_engines: ["dast"],
      }),
    );
  });

  it("cancels the new retest scan when the backend rejects the start", async () => {
    mockScans.start.mockRejectedValueOnce({
      response: { data: { detail: "Scan blocked: no compatible runner." } },
    });
    renderPage();

    await userEvent.click(
      await screen.findByRole("button", { name: "Retest" }),
    );

    await waitFor(() =>
      expect(mockScans.cancel).toHaveBeenCalledWith("scan-2"),
    );
    expect(await screen.findByText(/Retest not started/i)).toBeInTheDocument();
  });

  it("does not submit a retest when the authorization expired", async () => {
    mockAuths.list.mockResolvedValue({
      data: [{ ...activeAuth, active: false }],
    });
    renderPage();

    await userEvent.click(
      await screen.findByRole("button", { name: "Retest" }),
    );

    expect(
      await screen.findByText(/authorization for this website has expired/i),
    ).toBeInTheDocument();
    expect(mockScans.create).not.toHaveBeenCalled();
    expect(mockScans.start).not.toHaveBeenCalled();
  });

  it("keeps the partial-coverage banner for non-passive scans", async () => {
    mockScans.engineResults.mockResolvedValue({
      data: [{ ...engineRow, raw_summary: {} }],
    });
    renderPage();

    expect(
      await screen.findByText("Scan completed with partial coverage."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Retest" }),
    ).not.toBeInTheDocument();
  });

  it("maps missing-header evidence to remediation guidance", () => {
    expect(
      headerGuidance({ missing_header: "x-content-type-options" })?.example,
    ).toBe("X-Content-Type-Options: nosniff");
    expect(headerGuidance({ missing_header: "unknown" })).toBeNull();
    expect(headerGuidance(undefined)).toBeNull();
  });
});
