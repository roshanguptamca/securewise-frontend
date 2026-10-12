import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WorkerStatusPanel } from "../pages/autopentest/WorkerStatusPanel";
import { summarizeCapabilities } from "../pages/autopentest/workerCapabilities";
import type { SecureWiseWorkerStatus } from "../types";

const lightweight = {
  worker_available: true,
  docker_ready: false,
  capabilities: ["sast", "sca", "secrets", "iac", "api"],
  worker_profile: "lightweight",
  heartbeat_age_seconds: 4,
  queue: { queued_scans: 0, queued_pentests: 2 },
  autopentest_readiness: {
    worker_available: true,
    worker_supports_passive: false,
    worker_supports_authenticated_api: false,
    worker_supports_authenticated_browser: false,
    encryption_key_compatibility: "not_reported",
    diagnostics: [],
  },
} as unknown as SecureWiseWorkerStatus;

const states = (status?: SecureWiseWorkerStatus) =>
  Object.fromEntries(
    summarizeCapabilities(status).map((item) => [item.key, item.state]),
  );

describe("summarizeCapabilities", () => {
  it("marks only code scanning ready for the lightweight worker", () => {
    expect(states(lightweight)).toEqual({
      code: "ready",
      website: "not_configured",
      api: "not_configured",
      browser: "not_configured",
    });
  });

  it("requires Docker and a matched key for API and browser", () => {
    const full = {
      ...lightweight,
      docker_ready: true,
      capabilities: [
        ...lightweight.capabilities,
        "dast",
        "url_egress_restricted",
      ],
      autopentest_readiness: {
        ...lightweight.autopentest_readiness,
        worker_supports_authenticated_api: true,
        worker_supports_authenticated_browser: true,
        encryption_key_compatibility: "matched",
      },
    } as SecureWiseWorkerStatus;
    expect(Object.values(states(full))).toEqual(Array(4).fill("ready"));
    const mismatch = {
      ...full,
      autopentest_readiness: {
        ...full.autopentest_readiness,
        encryption_key_compatibility: "mismatch",
      },
    } as SecureWiseWorkerStatus;
    expect(states(mismatch).api).toBe("not_configured");
    expect(states(mismatch).browser).toBe("not_configured");
  });

  it("reports nothing ready without worker data or heartbeat", () => {
    expect(Object.values(states(undefined))).not.toContain("ready");
    expect(states({ ...lightweight, worker_available: false }).code).toBe(
      "not_configured",
    );
  });
});

describe("WorkerStatusPanel", () => {
  it("shows administrator guidance only to administrators", () => {
    const { rerender } = render(
      <WorkerStatusPanel
        status={lightweight}
        unavailable={false}
        isAdmin={false}
      />,
    );
    expect(screen.queryByText(/Administrator guidance/)).toBeNull();
    rerender(
      <WorkerStatusPanel status={lightweight} unavailable={false} isAdmin />,
    );
    expect(screen.getByText(/Administrator guidance/)).toBeInTheDocument();
  });

  it("does not call the worker unhealthy when optional capabilities are missing", () => {
    render(
      <WorkerStatusPanel
        status={lightweight}
        unavailable={false}
        isAdmin={false}
      />,
    );
    expect(screen.getByText(/· online/)).toBeInTheDocument();
    expect(screen.queryByText(/offline/i)).toBeNull();
  });
});
