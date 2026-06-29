/**
 * Test suite for shared UI state components:
 *   LoadingState, EmptyState, ErrorState
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LoadingState, EmptyState, ErrorState } from "../components/ui/States";

// ─── LoadingState ────────────────────────────────────────────────────────────
describe("LoadingState", () => {
  it("renders default loading message", () => {
    render(<LoadingState />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("renders custom loading message", () => {
    render(<LoadingState message="Fetching scans…" />);
    expect(screen.getByText("Fetching scans…")).toBeInTheDocument();
  });

  it("contains a spinner element", () => {
    const { container } = render(<LoadingState />);
    expect(container.querySelector(".spinner")).toBeInTheDocument();
  });
});

// ─── EmptyState ──────────────────────────────────────────────────────────────
describe("EmptyState", () => {
  it("renders default title", () => {
    render(<EmptyState />);
    expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
  });

  it("renders custom title", () => {
    render(<EmptyState title="No scans found" />);
    expect(screen.getByText("No scans found")).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(
      <EmptyState description="Create your first project to get started." />,
    );
    expect(
      screen.getByText("Create your first project to get started."),
    ).toBeInTheDocument();
  });

  it("does not render description element when omitted", () => {
    const { container } = render(<EmptyState />);
    // only 1 paragraph (the title) should exist
    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs).toHaveLength(1);
  });

  it("renders action node when provided", () => {
    render(<EmptyState action={<button>Create Project</button>} />);
    expect(
      screen.getByRole("button", { name: "Create Project" }),
    ).toBeInTheDocument();
  });

  it("does not render action area when no action provided", () => {
    render(<EmptyState />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

// ─── ErrorState ──────────────────────────────────────────────────────────────
describe("ErrorState", () => {
  it("renders default error message", () => {
    render(<ErrorState />);
    expect(screen.getByText("Something went wrong.")).toBeInTheDocument();
  });

  it("renders custom error message", () => {
    render(<ErrorState message="Failed to load findings." />);
    expect(screen.getByText("Failed to load findings.")).toBeInTheDocument();
  });

  it("renders retry button when onRetry is provided", () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    expect(
      screen.getByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
  });

  it("does not render retry button when onRetry is omitted", () => {
    render(<ErrorState />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("calls onRetry when Try again is clicked", () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
