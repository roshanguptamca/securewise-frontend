/**
 * Tests for AuthContext's logout() behavior: it must call the existing backend logout
 * endpoint, clear all local/session client-side auth state, and redirect to the
 * GuideWisey homepage (never an internal SecureWise route — there was no vercel.json SPA
 * rewrite, so a full-page navigation to a client-only route previously returned a genuine
 * Vercel edge 404).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockPost = vi.fn().mockResolvedValue({ data: {} });

vi.mock("../api/client", () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { id: 1, username: "test" } }),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

import { AuthProvider, useAuth } from "../context/AuthContext";

function LogoutButton() {
  const { logout } = useAuth();
  return <button onClick={() => void logout()}>Logout</button>;
}

describe("AuthContext logout()", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    Object.defineProperty(window, "location", {
      writable: true,
      configurable: true,
      value: { href: "https://securewise.guidewisey.com/dashboard" },
    });
    localStorage.clear();
    sessionStorage.clear();
    mockPost.mockClear();
    mockPost.mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      writable: true,
      configurable: true,
      value: originalLocation,
    });
    vi.unstubAllEnvs();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("redirects to VITE_GUIDEWISE_HOME_URL after logging out", async () => {
    vi.stubEnv("VITE_GUIDEWISE_HOME_URL", "https://www.guidewisey.com/");
    render(
      <AuthProvider>
        <LogoutButton />
      </AuthProvider>,
    );
    const button = await screen.findByText("Logout");
    await userEvent.click(button);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith("/accounts/logout/");
    });
    await waitFor(() => {
      expect(window.location.href).toBe("https://www.guidewisey.com/");
    });
  });

  it("never redirects to an internal dashboard/login path", async () => {
    vi.stubEnv("VITE_GUIDEWISE_HOME_URL", "https://www.guidewisey.com/");
    render(
      <AuthProvider>
        <LogoutButton />
      </AuthProvider>,
    );
    const button = await screen.findByText("Logout");
    await userEvent.click(button);

    await waitFor(() => {
      expect(window.location.href).not.toContain("/dashboard");
      expect(window.location.href).not.toContain("/login");
    });
  });

  it("still redirects home even if the logout API call fails", async () => {
    vi.stubEnv("VITE_GUIDEWISE_HOME_URL", "https://www.guidewisey.com/");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockPost.mockRejectedValueOnce(new Error("network error"));
    render(
      <AuthProvider>
        <LogoutButton />
      </AuthProvider>,
    );
    const button = await screen.findByText("Logout");
    await userEvent.click(button);

    await waitFor(() => {
      expect(window.location.href).toBe("https://www.guidewisey.com/");
    });
    // Failure must be logged (safely, no PII/tokens) rather than silently swallowed.
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("calls the backend logout endpoint before clearing state and redirecting", async () => {
    vi.stubEnv("VITE_GUIDEWISE_HOME_URL", "https://www.guidewisey.com/");
    const callOrder: string[] = [];
    mockPost.mockImplementationOnce(() => {
      callOrder.push("logout-api");
      return Promise.resolve({ data: {} });
    });
    render(
      <AuthProvider>
        <LogoutButton />
      </AuthProvider>,
    );
    const button = await screen.findByText("Logout");
    await userEvent.click(button);

    await waitFor(() => {
      expect(window.location.href).toBe("https://www.guidewisey.com/");
    });
    expect(callOrder).toEqual(["logout-api"]);
  });

  it("clears localStorage and sessionStorage on logout", async () => {
    vi.stubEnv("VITE_GUIDEWISE_HOME_URL", "https://www.guidewisey.com/");
    localStorage.setItem("some-stale-key", "value");
    sessionStorage.setItem("another-stale-key", "value");
    render(
      <AuthProvider>
        <LogoutButton />
      </AuthProvider>,
    );
    const button = await screen.findByText("Logout");
    await userEvent.click(button);

    await waitFor(() => {
      expect(localStorage.getItem("some-stale-key")).toBeNull();
      expect(sessionStorage.getItem("another-stale-key")).toBeNull();
    });
  });
});
