import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockDashboard = vi.hoisted(() => vi.fn());

vi.mock("../api/client", () => ({
  sw: { dashboard: mockDashboard },
}));

import Dashboard from "../pages/Dashboard";

const cweCoverage = Array.from(
  { length: 25 },
  (_, index) => `CWE-${index + 1}`,
);

describe("Dashboard", () => {
  beforeEach(() => {
    mockDashboard.mockResolvedValue({
      data: {
        total_projects: 0,
        total_scans: 0,
        open_findings: 0,
        critical_high_count: 0,
        security_score: 100,
        severity_counts: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
        recent_scans: [],
        top_risky_projects: [],
        owasp_top10_coverage: Object.fromEntries(
          Array.from({ length: 10 }, (_, index) => [
            `A${String(index + 1).padStart(2, "0")}`,
            0,
          ]),
        ),
        cwe_ids_covered: ["CWE-1", "CWE-2"],
        cwe_coverage: cweCoverage,
        security_taxonomy: {
          dataset_version: "securewise-security-taxonomy-1.1.0",
          cwe_top25_edition: "MITRE CWE Top 25 2025",
          owasp_edition: "OWASP Top 10 2021",
          cwe_source:
            "https://cwe.mitre.org/top25/archive/2025/2025_cwe_top25.html",
        },
        quality_gate_counts: { passed: 0, failed: 0 },
      },
    });
  });

  it("shows CWE coverage and edition from the backend taxonomy dataset", async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText("CWE Top 25 coverage (MITRE CWE Top 25 2025)"),
    ).toBeInTheDocument();
    expect(screen.getByText("2 / 25")).toBeInTheDocument();
  });
});
