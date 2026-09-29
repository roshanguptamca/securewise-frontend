import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  initializeAnalytics,
  resetAnalyticsForTests,
  sanitizeEventParameters,
  sanitizeLocation,
  sanitizePath,
  trackEvent,
  trackPageView,
} from "../analytics/ga4";

describe("GA4 analytics", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    delete window.gtag;
    delete window.dataLayer;
    delete window.GW_GA4_BOOTSTRAPPED_ID;
    resetAnalyticsForTests();
    window.history.replaceState(null, "", "/");
    vi.stubEnv("VITE_DEPLOYMENT_ENV", "production");
  });

  it("reuses the detector-visible Google tag without loading or configuring it twice", async () => {
    const queuedCalls: unknown[] = [];
    window.dataLayer = queuedCalls;
    window.gtag = (...args: unknown[]) => queuedCalls.push(args);
    window.GW_GA4_BOOTSTRAPPED_ID = "G-S5ZLBGRJD4";

    expect(await trackPageView("/dashboard")).toBe(true);
    expect(document.querySelectorAll("script")).toHaveLength(0);
    expect(
      queuedCalls.filter(
        (entry) => Array.isArray(entry) && entry[0] === "config",
      ),
    ).toHaveLength(0);
    expect(
      queuedCalls.filter(
        (entry) =>
          Array.isArray(entry) &&
          entry[0] === "event" &&
          entry[1] === "page_view",
      ),
    ).toHaveLength(1);
  });

  it("keeps the default ID aligned with the detector-visible HTML tag", () => {
    const html = readFileSync(join(process.cwd(), "index.html"), "utf8");
    expect(
      html.match(/googletagmanager\.com\/gtag\/js\?id=G-S5ZLBGRJD4/g),
    ).toHaveLength(1);
    expect(html.match(/gtag\("config", "G-S5ZLBGRJD4"/g)).toHaveLength(1);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("loads and initializes GA4 only once", async () => {
    vi.stubEnv("VITE_GA4_MEASUREMENT_ID", "G-S5ZLBGRJD4");
    const first = initializeAnalytics();
    const second = initializeAnalytics();
    const script = document.querySelector<HTMLScriptElement>("script");

    expect(first).toBe(second);
    expect(script?.src).toContain("G-S5ZLBGRJD4");

    script?.dispatchEvent(new Event("load"));
    expect(await first).toBe(true);
    expect(document.querySelectorAll("script").length).toBe(1);
    expect(window.dataLayer).toEqual([
      ["js", expect.any(Date)],
      [
        "config",
        "G-S5ZLBGRJD4",
        expect.objectContaining({ send_page_view: false }),
      ],
    ]);
  });

  it("sends explicit route page views without duplicates", async () => {
    const promise = trackPageView("/projects/project-123?token=secret");
    document.querySelector("script")?.dispatchEvent(new Event("load"));
    await promise;
    await trackPageView("/projects/project-123?token=secret");

    const pageContext = {
      page_path: "/projects/project-123",
      page_location: `${window.location.origin}/projects/project-123`,
      page_referrer: "",
      page_title: "SecureWise",
    };
    expect(window.dataLayer).toHaveLength(4);
    expect(window.dataLayer?.[2]).toEqual(["set", pageContext]);
    expect(window.dataLayer?.[3]).toEqual(["event", "page_view", pageContext]);
  });

  it("forwards valid events without accepting unsafe event names", async () => {
    const valid = trackEvent("scan_started", { source: "dashboard" });
    document.querySelector("script")?.dispatchEvent(new Event("load"));

    expect(await valid).toBe(true);
    expect(await trackEvent("Scan Started")).toBe(false);
    expect(window.dataLayer?.at(-1)).toEqual([
      "event",
      "scan_started",
      {
        source: "dashboard",
        page_path: "/dashboard",
        page_location: `${window.location.origin}/dashboard`,
        page_referrer: "",
        page_title: "SecureWise",
      },
    ]);
  });

  it("sanitizes paths and locations", () => {
    expect(
      sanitizePath(
        "/findings/550e8400-e29b-41d4-a716-446655440000?email=user@example.com#token",
      ),
    ).toBe("/findings/:id");
    expect(sanitizePath("/")).toBe("/dashboard");
    expect(
      sanitizeLocation(
        new URL(
          "https://securewise.example/findings/123456789?token=secret",
        ) as unknown as Location,
      ),
    ).toBe("https://securewise.example/findings/:id");
  });

  it("does not load analytics outside production", async () => {
    vi.stubEnv("VITE_DEPLOYMENT_ENV", "development");

    expect(await initializeAnalytics()).toBe(false);
    expect(document.querySelector("script")).toBeNull();
  });

  it("uses the built-in production ID when no override is configured", async () => {
    const promise = initializeAnalytics();
    document.querySelector("script")?.dispatchEvent(new Event("load"));

    expect(await promise).toBe(true);
    expect(document.querySelector<HTMLScriptElement>("script")?.src).toContain(
      "G-S5ZLBGRJD4",
    );
  });

  it("configures GA with sanitized page context from a raw URL", async () => {
    document.title = "Finding for user@example.com";
    window.history.replaceState(
      null,
      "",
      "/findings/123456789?token=secret&email=user@example.com#frag",
    );
    const promise = initializeAnalytics();
    document.querySelector("script")?.dispatchEvent(new Event("load"));
    await promise;

    const config = window.dataLayer?.[1] as unknown[];
    expect(config[0]).toBe("config");
    expect(config[2]).toEqual(
      expect.objectContaining({
        page_path: "/findings/:id",
        page_location: `${window.location.origin}/findings/:id`,
        page_referrer: "",
        page_title: "SecureWise",
        send_page_view: false,
      }),
    );
    expect(JSON.stringify(window.dataLayer)).not.toMatch(
      /secret|user@example|123456789|frag/,
    );
  });

  it("gives custom events sanitized context that callers cannot override", async () => {
    window.history.replaceState(null, "", "/scans/987654?token=secret");
    const promise = trackEvent("report_exported", {
      format: "pdf",
      page_location: "https://evil.example/?token=secret",
      page_referrer: "https://referrer.example/?q=secret",
      page_title: "user@example.com",
      email: "user@example.com",
      url: "https://securewise.example/scans?token=secret",
      "Bad Key": "x",
      count: 2,
    });
    document.querySelector("script")?.dispatchEvent(new Event("load"));
    await promise;

    expect(window.dataLayer?.at(-1)).toEqual([
      "event",
      "report_exported",
      {
        format: "pdf",
        count: 2,
        page_path: "/scans/:id",
        page_location: `${window.location.origin}/scans/:id`,
        page_referrer: "",
        page_title: "SecureWise",
      },
    ]);
    expect(JSON.stringify(window.dataLayer)).not.toMatch(
      /secret|user@example|987654/,
    );
  });

  it("drops sensitive custom event parameter values", () => {
    expect(
      sanitizeEventParameters({
        source: "dashboard",
        path: "/projects/550e8400-e29b-41d4-a716-446655440000",
        query: "a=b",
        token: "abcdefghijklmnopqrstuvwxyz123456",
        enabled: true,
      }),
    ).toEqual({ source: "dashboard", enabled: true });
  });
});
