/**
 * Test suite for Badge UI components.
 * Verifies rendering, class assignment, and display text.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  SeverityBadge,
  ScanStatusBadge,
  FindingStatusBadge,
  GitStatusBadge,
} from "../components/ui/Badges";

describe("SeverityBadge", () => {
  const severities = ["critical", "high", "medium", "low", "info"] as const;

  it.each(severities)('renders "%s" severity with correct text', (sev) => {
    render(<SeverityBadge value={sev} />);
    expect(screen.getByText(sev)).toBeInTheDocument();
  });

  it("applies badge-critical class for critical severity", () => {
    const { container } = render(<SeverityBadge value="critical" />);
    expect(container.firstChild).toHaveClass("badge-critical");
  });

  it("applies badge-high class for high severity", () => {
    const { container } = render(<SeverityBadge value="high" />);
    expect(container.firstChild).toHaveClass("badge-high");
  });

  it("applies badge-low class for low severity", () => {
    const { container } = render(<SeverityBadge value="low" />);
    expect(container.firstChild).toHaveClass("badge-low");
  });
});

describe("ScanStatusBadge", () => {
  const statuses = [
    "pending",
    "queued",
    "running",
    "completed",
    "failed",
    "cancelled",
  ] as const;

  it.each(statuses)('renders "%s" status', (status) => {
    render(<ScanStatusBadge value={status} />);
    expect(screen.getByText(status)).toBeInTheDocument();
  });

  it("shows spinner inside running badge", () => {
    const { container } = render(<ScanStatusBadge value="running" />);
    // spinner element should be present
    expect(container.querySelector(".spinner")).toBeInTheDocument();
  });

  it("does NOT show spinner for completed status", () => {
    const { container } = render(<ScanStatusBadge value="completed" />);
    expect(container.querySelector(".spinner")).not.toBeInTheDocument();
  });

  it("applies badge-completed class for completed", () => {
    const { container } = render(<ScanStatusBadge value="completed" />);
    expect(container.firstChild).toHaveClass("badge-completed");
  });

  it("applies badge-failed class for failed", () => {
    const { container } = render(<ScanStatusBadge value="failed" />);
    expect(container.firstChild).toHaveClass("badge-failed");
  });
});

describe("FindingStatusBadge", () => {
  it('renders "open" finding status', () => {
    render(<FindingStatusBadge value="open" />);
    expect(screen.getByText("open")).toBeInTheDocument();
  });

  it('renders "accepted_risk" with underscore replaced by space', () => {
    render(<FindingStatusBadge value="accepted_risk" />);
    expect(screen.getByText("accepted risk")).toBeInTheDocument();
  });

  it('renders "false_positive" with underscore replaced by space', () => {
    render(<FindingStatusBadge value="false_positive" />);
    expect(screen.getByText("false positive")).toBeInTheDocument();
  });

  it("applies badge-open class", () => {
    const { container } = render(<FindingStatusBadge value="open" />);
    expect(container.firstChild).toHaveClass("badge-open");
  });

  it("applies badge-fixed class", () => {
    const { container } = render(<FindingStatusBadge value="fixed" />);
    expect(container.firstChild).toHaveClass("badge-fixed");
  });
});

describe("GitStatusBadge", () => {
  it('renders "active" status', () => {
    render(<GitStatusBadge value="active" />);
    expect(screen.getByText("active")).toBeInTheDocument();
  });

  it('renders "expired" status', () => {
    render(<GitStatusBadge value="expired" />);
    expect(screen.getByText("expired")).toBeInTheDocument();
  });

  it('renders "revoked" status', () => {
    render(<GitStatusBadge value="revoked" />);
    expect(screen.getByText("revoked")).toBeInTheDocument();
  });

  it('renders "error" status', () => {
    render(<GitStatusBadge value="error" />);
    expect(screen.getByText("error")).toBeInTheDocument();
  });

  it("applies badge-completed class for active (maps to completed color)", () => {
    const { container } = render(<GitStatusBadge value="active" />);
    expect(container.firstChild).toHaveClass("badge-completed");
  });

  it("applies badge-failed class for revoked", () => {
    const { container } = render(<GitStatusBadge value="revoked" />);
    expect(container.firstChild).toHaveClass("badge-failed");
  });
});
