/**
 * Tests for AuthContext's logout() redirect behavior.
 *
 * Regression: logout() used to redirect to VITE_LOGIN_URL (a GuideWisey
 * *login* page), and there was no vercel.json SPA rewrite — so any full-page
 * navigation to an internal client-only route (e.g. a misconfigured target
 * ending up at "/dashboard") returned a genuine Vercel edge 404. Logout must
 * always leave SecureWise for an absolute GuideWisey homepage URL.
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
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      writable: true,
      configurable: true,
      value: originalLocation,
    });
    vi.unstubAllEnvs();
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
  });
});
