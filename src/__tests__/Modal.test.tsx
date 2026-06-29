/**
 * Test suite for the Modal UI component.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Modal } from "../components/ui/Modal";

describe("Modal", () => {
  const defaultProps = {
    title: "Test Modal",
    onClose: vi.fn(),
    children: <p>Modal content</p>,
  };

  it("renders title", () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByText("Test Modal")).toBeInTheDocument();
  });

  it("renders children", () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByText("Modal content")).toBeInTheDocument();
  });

  it("renders close button", () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByLabelText("Close")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    const { container } = render(<Modal {...defaultProps} onClose={onClose} />);
    const backdrop = container.querySelector(".modal-backdrop") as Element;
    // Simulate click on the backdrop itself (target === currentTarget)
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it("does NOT call onClose when modal body is clicked", () => {
    const onClose = vi.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);
    // Clicking the content — should not close
    fireEvent.click(screen.getByText("Modal content"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("renders footer when provided", () => {
    render(<Modal {...defaultProps} footer={<button>Save</button>} />);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("does NOT render footer element when not provided", () => {
    const { container } = render(<Modal {...defaultProps} />);
    expect(container.querySelector(".modal-footer")).not.toBeInTheDocument();
  });

  it("applies wide style when wide=true", () => {
    const { container } = render(<Modal {...defaultProps} wide />);
    const modal = container.querySelector(".modal") as HTMLElement;
    expect(modal.style.maxWidth).toBe("720px");
  });

  it("does NOT apply maxWidth when wide is omitted", () => {
    const { container } = render(<Modal {...defaultProps} />);
    const modal = container.querySelector(".modal") as HTMLElement;
    expect(modal.style.maxWidth).toBe("");
  });
});
