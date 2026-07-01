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
    request: vi.fn().mockResolvedValue({ data: {} }),
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
  beforeEach(async () => {
    Object.defineProperty(document, "cookie", {
      writable: true,
      configurable: true,
      value: "",
    });
    const { __resetCsrfCacheForTests } = await import("../api/client");
    __resetCsrfCacheForTests();
  });

  afterEach(() => {
    Object.defineProperty(document, "cookie", {
      writable: true,
      configurable: true,
      value: "",
    });
  });

  it("does NOT inject X-CSRFToken header for a GET request (no CSRF needed for safe methods)", async () => {
    Object.defineProperty(document, "cookie", {
      writable: true,
      configurable: true,
      value: "csrftoken=test-csrf-value",
    });
    const config = { method: "get", headers: {} as Record<string, string> };
    const result = (await captors.requestCb!(
      config as Record<string, unknown>,
    )) as { headers: Record<string, string> };
    expect(result.headers["X-CSRFToken"]).toBeUndefined();
  });

  it("does NOT inject X-CSRFToken header on a mutating request when no cookie/cached token is available and the CSRF endpoint returns nothing useful", async () => {
    document.cookie = "";
    const config = { method: "post", headers: {} as Record<string, string> };
    const result = (await captors.requestCb!(
      config as Record<string, unknown>,
    )) as { headers: Record<string, string> };
    expect(result.headers["X-CSRFToken"]).toBeUndefined();
  });

  it("injects X-CSRFToken header on a mutating request when csrftoken cookie is present", async () => {
    Object.defineProperty(document, "cookie", {
      writable: true,
      configurable: true,
      value: "sessionid=abc; csrftoken=test-csrf-value; othercookie=xyz",
    });
    const config = { method: "post", headers: {} as Record<string, string> };
    const result = (await captors.requestCb!(
      config as Record<string, unknown>,
    )) as { headers: Record<string, string> };
    expect(result.headers["X-CSRFToken"]).toBe("test-csrf-value");
  });

  it("picks only the csrftoken value when multiple cookies are present", async () => {
    Object.defineProperty(document, "cookie", {
      writable: true,
      configurable: true,
      value: "a=1; csrftoken=my-token-123; b=2",
    });
    const config = { method: "patch", headers: {} as Record<string, string> };
    const result = (await captors.requestCb!(
      config as Record<string, unknown>,
    )) as { headers: Record<string, string> };
    expect(result.headers["X-CSRFToken"]).toBe("my-token-123");
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

  it("does NOT redirect to login on a 403 from the logout endpoint (even after CSRF retry fails)", async () => {
    // logout() itself is responsible for clearing state and redirecting home in this
    // case — bouncing to the GuideWisey login screen instead would be wrong UX for a
    // user who explicitly asked to log out.
    const error = {
      response: { status: 403 },
      config: { method: "post", url: "/accounts/logout/", _csrfRetry: true },
    };
    await expect(captors.responseErrorCb!(error)).rejects.toBe(error);
    expect(window.location.href).toBe("http://localhost:5174/dashboard");
  });
});

// ─── CSRF retry-on-403 ────────────────────────────────────────────────────────
describe("Response interceptor — CSRF retry on 403", () => {
  const originalLocation = window.location;

  beforeEach(async () => {
    Object.defineProperty(window, "location", {
      writable: true,
      configurable: true,
      value: { href: "http://localhost:5174/dashboard", assign: vi.fn() },
    });
    Object.defineProperty(document, "cookie", {
      writable: true,
      configurable: true,
      value: "",
    });
    const { __resetCsrfCacheForTests } = await import("../api/client");
    __resetCsrfCacheForTests();
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      writable: true,
      configurable: true,
      value: originalLocation,
    });
    Object.defineProperty(document, "cookie", {
      writable: true,
      configurable: true,
      value: "",
    });
  });

  it("fetches a fresh CSRF token and retries once on a 403 from a mutating request", async () => {
    const { default: api } = await import("../api/client");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const requestSpy = vi
      .spyOn(api, "request")
      .mockResolvedValueOnce({ data: { ok: true } } as never);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getSpy = vi
      .spyOn(api, "get")
      .mockResolvedValueOnce({ data: { csrfToken: "fresh-token" } } as never);

    const config = { method: "post", url: "/accounts/logout/", headers: {} };
    const error = { response: { status: 403 }, config };

    const result = await captors.responseErrorCb!(error);

    expect(getSpy).toHaveBeenCalledWith("/accounts/csrf/");
    expect(requestSpy).toHaveBeenCalledTimes(1);
    const retriedConfig = requestSpy.mock.calls[0][0] as {
      headers: Record<string, string>;
      _csrfRetry?: boolean;
    };
    expect(retriedConfig.headers["X-CSRFToken"]).toBe("fresh-token");
    expect(retriedConfig._csrfRetry).toBe(true);
    expect(result).toEqual({ data: { ok: true } });

    requestSpy.mockRestore();
    getSpy.mockRestore();
  });

  it("does not retry a second time if the retried request also gets a 403", async () => {
    const { default: api } = await import("../api/client");
    const getSpy = vi
      .spyOn(api, "get")
      .mockResolvedValue({ data: { csrfToken: "fresh-token" } } as never);

    const config = {
      method: "post",
      url: "/accounts/logout/",
      headers: {},
      _csrfRetry: true, // already retried once
    };
    const error = { response: { status: 403 }, config };

    await expect(captors.responseErrorCb!(error)).rejects.toBe(error);
    expect(getSpy).not.toHaveBeenCalled();

    getSpy.mockRestore();
  });
});
