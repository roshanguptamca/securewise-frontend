/**
 * Tests for the axios client interceptors:
 *   - CSRF token injection (request interceptor)
 *   - 401/403 redirect to login (response interceptor)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Hoist interceptor container so it's available inside vi.mock factory ────
// vi.mock factories are hoisted before all other code, so vi.hoisted() is
// required for any state that the factory needs to read/write.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const captors = vi.hoisted(() => ({
  requestCb: null as
    null | ((cfg: Record<string, unknown>) => Record<string, unknown>),
  responseSuccessCb: null as null | ((res: unknown) => unknown),
  responseErrorCb: null as null | ((err: unknown) => Promise<never>),
}));

vi.mock("axios", () => {
  const mockInstance = {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    patch: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
    interceptors: {
      request: {
        use: vi.fn(
          (cb: (cfg: Record<string, unknown>) => Record<string, unknown>) => {
            captors.requestCb = cb;
          },
        ),
      },
      response: {
        use: vi.fn(
          (
            successCb: (res: unknown) => unknown,
            errorCb: (err: unknown) => Promise<never>,
          ) => {
            captors.responseSuccessCb = successCb;
            captors.responseErrorCb = errorCb;
          },
        ),
      },
    },
    defaults: { headers: { common: {} } },
  };
  return {
    default: {
      create: vi.fn(() => mockInstance),
    },
  };
});

// Import AFTER mock registration so interceptors are captured
import "../api/client";

// ─── CSRF interceptor ────────────────────────────────────────────────────────
describe("Request interceptor — CSRF token injection", () => {
  beforeEach(() => {
    Object.defineProperty(document, "cookie", {
      writable: true,
      configurable: true,
      value: "",
    });
  });

  afterEach(() => {
    Object.defineProperty(document, "cookie", {
      writable: true,
      configurable: true,
      value: "",
    });
  });

  it("does NOT inject X-CSRFToken header when cookie is absent", () => {
    document.cookie = "";
    const config = { headers: {} as Record<string, string> };
    const result = captors.requestCb!(config as Record<string, unknown>);
    expect(
      (result as { headers: Record<string, string> }).headers["X-CSRFToken"],
    ).toBeUndefined();
  });

  it("injects X-CSRFToken header when csrftoken cookie is present", () => {
    Object.defineProperty(document, "cookie", {
      writable: true,
      configurable: true,
      value: "sessionid=abc; csrftoken=test-csrf-value; othercookie=xyz",
    });
    const config = { headers: {} as Record<string, string> };
    const result = captors.requestCb!(config as Record<string, unknown>);
    expect(
      (result as { headers: Record<string, string> }).headers["X-CSRFToken"],
    ).toBe("test-csrf-value");
  });

  it("picks only the csrftoken value when multiple cookies are present", () => {
    Object.defineProperty(document, "cookie", {
      writable: true,
      configurable: true,
      value: "a=1; csrftoken=my-token-123; b=2",
    });
    const config = { headers: {} as Record<string, string> };
    const result = captors.requestCb!(config as Record<string, unknown>);
    expect(
      (result as { headers: Record<string, string> }).headers["X-CSRFToken"],
    ).toBe("my-token-123");
  });
});

// ─── Response interceptor ────────────────────────────────────────────────────
describe("Response interceptor — error handling", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    // Replace window.location with a writable mock
    Object.defineProperty(window, "location", {
      writable: true,
      configurable: true,
      value: { href: "http://localhost:5174/dashboard", assign: vi.fn() },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      writable: true,
      configurable: true,
      value: originalLocation,
    });
  });

  it("success interceptor returns response unchanged", async () => {
    const response = { data: { id: 1 }, status: 200 };
    const result = await captors.responseSuccessCb!(response);
    expect(result).toBe(response);
  });

  it("redirects to /login/ on 401 response", async () => {
    const error = { response: { status: 401 } };
    await expect(captors.responseErrorCb!(error)).rejects.toBe(error);
    expect(window.location.href).toContain("login");
  });

  it("redirects to /login/ on 403 response", async () => {
    const error = { response: { status: 403 } };
    await expect(captors.responseErrorCb!(error)).rejects.toBe(error);
    expect(window.location.href).toContain("login");
  });

  it("does NOT redirect on 404 response", async () => {
    const error = { response: { status: 404 } };
    await expect(captors.responseErrorCb!(error)).rejects.toBe(error);
    // location.href should still be the original value (no redirect)
    expect(window.location.href).toBe("http://localhost:5174/dashboard");
  });

  it("does NOT redirect on 500 response", async () => {
    const error = { response: { status: 500 } };
    await expect(captors.responseErrorCb!(error)).rejects.toBe(error);
    expect(window.location.href).toBe("http://localhost:5174/dashboard");
  });

  it("does NOT redirect when response is absent (network error)", async () => {
    const error = { message: "Network Error" }; // no .response
    await expect(captors.responseErrorCb!(error)).rejects.toBe(error);
    expect(window.location.href).toBe("http://localhost:5174/dashboard");
  });
});
