import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const mockFindings = vi.hoisted(() => ({
  get: vi.fn(),
  update: vi.fn(),
  acceptRisk: vi.fn(),
  markFalsePositive: vi.fn(),
  createTicket: vi.fn(),
  createPr: vi.fn(),
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
  ticket_url: "",
  ticket_created_at: null as string | null,
  pr_url: "",
  pr_created_at: null as string | null,
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
      ticket_url: "",
      ticket_created_at: null,
      pr_url: "",
      pr_created_at: null,
    });
    mockFindings.get.mockResolvedValue({ data: currentFinding });
    mockFindings.update.mockResolvedValue({ data: {} });
    mockFindings.acceptRisk.mockResolvedValue({ data: {} });
    mockFindings.markFalsePositive.mockResolvedValue({ data: {} });
    mockFindings.createTicket.mockResolvedValue({
      data: {
        ticket_url: "https://github.com/owner/repo/issues/123",
      },
    });
    mockFindings.createPr.mockResolvedValue({
      data: {
        pr_url: "https://github.com/owner/repo/pull/45",
      },
    });
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

  it("renders enabled create ticket and create PR buttons when no links exist", async () => {
    renderPage();

    expect(
      await screen.findByRole("button", { name: /create ticket/i }),
    ).toBeEnabled();
    expect(screen.getByRole("button", { name: /create pr/i })).toBeEnabled();
  });

  it("creates a ticket and switches to the view ticket link", async () => {
    renderPage();

    await userEvent.click(
      await screen.findByRole("button", { name: /create ticket/i }),
    );

    expect(mockFindings.createTicket).toHaveBeenCalledWith("finding-1");
    expect(
      await screen.findByRole("link", { name: /view ticket/i }),
    ).toHaveAttribute("href", "https://github.com/owner/repo/issues/123");
    expect(screen.getByText(/GitHub issue created/i)).toBeInTheDocument();
  });

  it("shows the API detail when ticket creation fails", async () => {
    mockFindings.createTicket.mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          detail: "This repository has no GitHub integration configured.",
        },
      },
    });

    renderPage();

    await userEvent.click(
      await screen.findByRole("button", { name: /create ticket/i }),
    );

    expect(
      await screen.findByText(
        /This repository has no GitHub integration configured\./i,
      ),
    ).toBeInTheDocument();
  });

  it("shows a view ticket link when a ticket already exists", async () => {
    currentFinding.ticket_url = "https://github.com/owner/repo/issues/999";
    currentFinding.ticket_created_at = new Date().toISOString();

    renderPage();

    expect(
      await screen.findByRole("link", { name: /view ticket/i }),
    ).toHaveAttribute("href", "https://github.com/owner/repo/issues/999");
    expect(
      screen.queryByRole("button", { name: /create ticket/i }),
    ).not.toBeInTheDocument();
  });

  it("creates a PR and switches to the view PR link", async () => {
    renderPage();

    await userEvent.click(
      await screen.findByRole("button", { name: /create pr/i }),
    );

    expect(mockFindings.createPr).toHaveBeenCalledWith("finding-1");
    expect(
      await screen.findByRole("link", { name: /view pr/i }),
    ).toHaveAttribute("href", "https://github.com/owner/repo/pull/45");
    expect(
      screen.getByText(/GitHub pull request created/i),
    ).toBeInTheDocument();
  });

  it("shows the API detail when PR creation fails", async () => {
    mockFindings.createPr.mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          detail:
            "This finding doesn't have enough information (file path + before/after code) to generate an automatic pull request. Use 'Create Ticket' instead.",
        },
      },
    });

    renderPage();

    await userEvent.click(
      await screen.findByRole("button", { name: /create pr/i }),
    );

    expect(
      await screen.findByText(/doesn't have enough information/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Use 'Create Ticket' instead\./i),
    ).toBeInTheDocument();
  });
});
