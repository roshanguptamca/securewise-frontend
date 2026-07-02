import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const mockFindings = vi.hoisted(() => ({
  get: vi.fn(),
  update: vi.fn(),
  acceptRisk: vi.fn(),
  markFalsePositive: vi.fn(),
  aiSuggestion: vi.fn(),
}));

const currentFinding = vi.hoisted(() => ({
  id: "finding-1",
  scan: "scan-1",
  project: "proj-1",
  organization: "org-1",
  title: "SQL injection risk",
  description: "Unsanitized input reaches the database.",
  file_path: "src/server.ts",
  line_number: 42,
  endpoint: "",
  cwe_id: "CWE-89",
  owasp_category: "A03:2021",
  scanner_type: "sast",
  severity: "high",
  confidence: "high",
  status: "open",
  risk: "Attackers may run arbitrary SQL.",
  impact: "Data exposure.",
  recommendation: "Use parameterized queries.",
  bad_code_example: "db.query(userInput)",
  fixed_code_example: "db.query('SELECT * FROM t WHERE id = ?', [id])",
  code_snippet:
    " 40 | const id = req.query.id\n>>41 | db.query(userInput)\n 42 | return res.send()",
  evidence: {},
  fingerprint: "fp-1",
  ai_fix_suggestion: "",
  reviewed_by: null,
  reviewed_by_detail: null,
  reviewed_at: null,
  review_note: "",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}));

vi.mock("../api/client", () => ({
  sw: {
    findings: mockFindings,
  },
}));

import FindingDetailPage from "../pages/findings/FindingDetailPage";

describe("FindingDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(currentFinding, {
      code_snippet:
        " 40 | const id = req.query.id\n>>41 | db.query(userInput)\n 42 | return res.send()",
      status: "open",
    });
    mockFindings.get.mockResolvedValue({ data: currentFinding });
    mockFindings.update.mockResolvedValue({ data: {} });
    mockFindings.acceptRisk.mockResolvedValue({ data: {} });
    mockFindings.markFalsePositive.mockResolvedValue({ data: {} });
    mockFindings.aiSuggestion.mockResolvedValue({
      data: {
        ai_fix_suggestion: {
          explanation: "Escape and parameterize user-controlled values.",
          why_dangerous: "Attackers can alter the query structure.",
          fixed_code_example:
            "db.query('SELECT * FROM users WHERE id = ?', [id]);",
          framework_guidance: "Use your ORM parameter binding helpers.",
          confidence: "high",
        },
        cached: true,
      },
    });
  });

  function renderPage() {
    render(
      <MemoryRouter initialEntries={["/findings/finding-1"]}>
        <Routes>
          <Route path="/findings/:id" element={<FindingDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it("renders the vulnerable code panel when code_snippet is present", async () => {
    renderPage();

    expect(
      await screen.findByText(/>>41 \| db\.query\(userInput\)/i),
    ).toBeInTheDocument();
  });

  it("hides the vulnerable code panel when code_snippet is empty", async () => {
    currentFinding.code_snippet = "   ";
    renderPage();

    await screen.findByText(currentFinding.title, { selector: "h1" });
    expect(
      screen.queryByText(/>>41 \| db\.query\(userInput\)/i),
    ).not.toBeInTheDocument();
  });

  it("loads and renders an AI suggestion", async () => {
    let resolveSuggestion: ((value: any) => void) | undefined;
    mockFindings.aiSuggestion.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSuggestion = resolve;
      }),
    );

    renderPage();

    const button = await screen.findByRole("button", {
      name: /get ai fix suggestion/i,
    });
    await userEvent.click(button);

    expect(screen.getByText(/Generating suggestion/i)).toBeInTheDocument();

    resolveSuggestion?.({
      data: {
        ai_fix_suggestion: {
          explanation: "Escape and parameterize user-controlled values.",
          why_dangerous: "Attackers can alter the query structure.",
          fixed_code_example:
            "db.query('SELECT * FROM users WHERE id = ?', [id]);",
          framework_guidance: "Use your ORM parameter binding helpers.",
          confidence: "high",
        },
        cached: false,
      },
    });

    expect(
      await screen.findByText(
        /AI-Generated Suggestion \(verify before applying\)/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Attackers can alter the query structure/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Framework guidance/i)).toBeInTheDocument();
    expect(screen.getByText(/high confidence/i)).toBeInTheDocument();
  });

  it("shows an engine unavailable notice when AI recommendations are disabled", async () => {
    mockFindings.aiSuggestion.mockResolvedValueOnce({
      data: {
        ai_fix_suggestion: null,
        cached: false,
        engine_unavailable: true,
      },
    });

    renderPage();

    await userEvent.click(
      await screen.findByRole("button", { name: /get ai fix suggestion/i }),
    );

    expect(
      await screen.findByText(
        /AI recommendations are not configured in this environment/i,
      ),
    ).toBeInTheDocument();
  });
});
