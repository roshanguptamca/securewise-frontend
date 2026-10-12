import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const mockApi = vi.hoisted(() => ({
  createSession: vi.fn(),
  createScan: vi.fn(),
  startScan: vi.fn(),
}));

vi.mock("../api/client", () => ({
  sw: {
    scans: { create: mockApi.createScan, start: mockApi.startScan },
    autopentest: { create: mockApi.createSession },
  },
}));

import AssessmentWizard from "../pages/autopentest/AssessmentWizard";
import { WorkerStatusPanel } from "../pages/autopentest/WorkerStatusPanel";
import { summarizeCapabilities } from "../pages/autopentest/workerCapabilities";
import type { SecureWiseWorkerStatus } from "../types";

const projects = [{ id: "project-1", organization: "org-1", name: "Fixture" }];
const repositories = [
  {
    id: "repo-1",
    organization: "org-1",
    project: "project-1",
    name: "securewise-idor-fixture",
  },
];

function status(
  overrides: {
    capabilities?: string[];
    docker_ready?: boolean;
    readiness?: Record<string, unknown>;
  } = {},
): SecureWiseWorkerStatus {
  return {
    worker_available: true,
    docker_ready: overrides.docker_ready ?? true,
    capabilities: overrides.capabilities ?? [
      "docker_daemon",
      "autopentest_experimental_low_resource",
    ],
    worker_profile: "autopentest_api",
    heartbeat_age_seconds: 2,
    queue: { queued_scans: 0, queued_pentests: 0 },
    autopentest_readiness: {
      worker_available: true,
      worker_supports_passive: false,
      worker_supports_authenticated_api: false,
      worker_supports_authenticated_browser: false,
      worker_supports_experimental_api: true,
      experimental_low_resource_enabled: true,
      resource_tier: "experimental",
      encryption_key_compatibility: "matched",
      diagnostics: [],
      ...overrides.readiness,
    },
  } as unknown as SecureWiseWorkerStatus;
}

function renderWizard(
  readiness: SecureWiseWorkerStatus,
  { isAdmin = true, previewEnabled = false } = {},
) {
  return render(
    <MemoryRouter>
      <AssessmentWizard
        projects={projects as never}
        repositories={repositories as never}
        targets={[]}
        authorizations={[]}
        readiness={readiness}
        readinessUnavailable={false}
        isAdmin={isAdmin}
        previewEnabled={previewEnabled}
        onSessionCreated={vi.fn()}
        onScanCreated={vi.fn()}
        onRetestConsumed={vi.fn()}
      />
    </MemoryRouter>,
  );
}

async function walkToReview(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /Backend API/i }));
  await user.click(
    screen.getByRole("button", { name: "Continue to next step" }),
  );
  await user.selectOptions(screen.getByLabelText("Project"), "project-1");
  await user.selectOptions(
    screen.getByLabelText("GitHub repository"),
    "repo-1",
  );
  await user.click(screen.getByRole("radio", { name: "With Login" }));
  await user.click(
    screen.getByRole("button", { name: "Continue to next step" }),
  );
  await user.type(
    screen.getByLabelText("User A synthetic bearer token"),
    "tok-a",
  );
  await user.type(
    screen.getByLabelText("User B synthetic bearer token"),
    "tok-b",
  );
  await user.type(
    screen.getByLabelText("Administrator synthetic bearer token"),
    "tok-admin",
  );
  await user.click(
    screen.getByRole("button", { name: "Continue to next step" }),
  );
  await user.type(
    screen.getByLabelText("Authorization reference"),
    "fixture approval ticket",
  );
}

const authorizeCheckbox = () =>
  screen.getByRole("checkbox", {
    name: /i am authorized to assess this exact target and scope/i,
  });

describe("experimental low-resource authenticated API assessment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.createSession.mockResolvedValue({ data: { id: "session-1" } });
  });

  it("labels the API card experimental and requires the resource-risk confirmation to start", async () => {
    const user = userEvent.setup();
    renderWizard(status());
    expect(
      screen.getByRole("button", {
        name: /Backend API.*Experimental — limited resources/i,
      }),
    ).toBeEnabled();

    await walkToReview(user);
    expect(
      screen.getByRole("status", {
        name: "Readiness: Experimental — limited resources",
      }),
    ).toBeInTheDocument();
    await user.click(authorizeCheckbox());

    const start = screen.getByRole("button", { name: /start assessment/i });
    expect(start).toBeDisabled();
    expect(screen.getByText(/Confirm the limited-resource risk/)).toBeVisible();

    await user.click(
      within(screen.getByTestId("resource-risk")).getByRole("checkbox"),
    );
    expect(start).toBeEnabled();
    await user.click(start);

    await waitFor(() =>
      expect(mockApi.createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "authenticated_api",
          experimental_low_resource: true,
          timeout_seconds: 600,
          requests_per_minute: 20,
        }),
      ),
    );
  });

  it("does not offer the experimental path to non-administrators", () => {
    renderWizard(status(), { isAdmin: false });
    expect(
      screen.getByRole("button", { name: /Backend API.*Setup required/i }),
    ).toBeDisabled();
    expect(mockApi.createSession).not.toHaveBeenCalled();
  });

  it.each([
    ["Docker is not ready", { docker_ready: false }],
    [
      "encryption keys do not match",
      { readiness: { encryption_key_compatibility: "mismatch" } },
    ],
    [
      "the experimental mode is disabled",
      { readiness: { experimental_low_resource_enabled: false } },
    ],
    [
      "the worker does not report experimental support",
      { readiness: { worker_supports_experimental_api: false } },
    ],
  ])("stays 'Setup required' when %s", (_label, overrides) => {
    renderWizard(status(overrides));
    expect(
      screen.getByRole("button", { name: /Backend API.*Setup required/i }),
    ).toBeDisabled();
  });

  it("never starts a preview even in DEV/ACC when hard prerequisites are unmet", async () => {
    const user = userEvent.setup();
    renderWizard(status({ docker_ready: false }), { previewEnabled: true });
    await user.click(screen.getByRole("button", { name: /Backend API/i }));
    await user.click(
      screen.getByRole("button", { name: "Continue to next step" }),
    );
    await user.click(screen.getByRole("radio", { name: "With Login" }));
    await user.click(
      screen.getByRole("button", { name: "Continue to next step" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Continue to next step" }),
    );
    expect(
      screen.getByRole("button", { name: /start assessment/i }),
    ).toBeDisabled();
    expect(mockApi.createSession).not.toHaveBeenCalled();
  });

  it("uses the normal path without the risk prompt on a recommended-size worker", async () => {
    const user = userEvent.setup();
    renderWizard(
      status({
        capabilities: ["docker_daemon", "autopentest_authenticated_api"],
        readiness: {
          worker_supports_authenticated_api: true,
          worker_supports_experimental_api: false,
          resource_tier: "recommended",
        },
      }),
    );
    expect(
      screen.getByRole("button", { name: /Backend API.*Ready to run/i }),
    ).toBeEnabled();
    await walkToReview(user);
    await user.click(authorizeCheckbox());
    expect(screen.queryByTestId("resource-risk")).toBeNull();
    await user.click(screen.getByRole("button", { name: /start assessment/i }));
    await waitFor(() => expect(mockApi.createSession).toHaveBeenCalled());
    expect(mockApi.createSession.mock.calls[0][0]).not.toHaveProperty(
      "experimental_low_resource",
    );
    expect(mockApi.createSession.mock.calls[0][0].timeout_seconds).toBe(900);
  });
});

describe("worker summary for experimental workers", () => {
  it("reports API testing as experimental, not ready, and shows sizing in diagnostics", () => {
    const experimental = status();
    expect(
      Object.fromEntries(
        summarizeCapabilities(experimental).map((item) => [
          item.key,
          item.state,
        ]),
      ).api,
    ).toBe("experimental");

    render(
      <WorkerStatusPanel status={experimental} unavailable={false} isAdmin />,
    );
    expect(
      screen.getByText("Experimental — limited resources"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Below recommended CPU or memory \(experimental\)/),
    ).toBeInTheDocument();
  });

  it("does not report experimental when the encryption key or Docker prerequisite fails", () => {
    for (const broken of [
      status({ docker_ready: false }),
      status({ readiness: { encryption_key_compatibility: "mismatch" } }),
    ]) {
      expect(
        summarizeCapabilities(broken).find((item) => item.key === "api")?.state,
      ).toBe("not_configured");
    }
  });
});

describe("public website readiness blockers", () => {
  it("shows the exact backend blocker and never submits when the website worker is not ready", async () => {
    const user = userEvent.setup();
    const blocked = {
      ...status({ capabilities: ["sast", "sca", "secrets", "iac", "api"] }),
      website_readiness: {
        ready: false,
        worker_ready: false,
        blockers: [
          {
            code: "worker_profile",
            message:
              "Online workers use a restricted profile that never runs website checks.",
          },
        ],
      },
    } as SecureWiseWorkerStatus;
    renderWizard(blocked, { previewEnabled: true });

    await user.click(
      screen.getByRole("button", { name: /^Website \/ Frontend/i }),
    );
    await user.click(
      screen.getByRole("button", { name: "Continue to next step" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Continue to next step" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Continue to next step" }),
    );
    expect(
      await screen.findByLabelText("Missing prerequisites"),
    ).toHaveTextContent(/restricted profile that never runs website checks/);
    expect(
      screen.getByRole("button", { name: /Start assessment/i }),
    ).toBeDisabled();
    expect(mockApi.createScan).not.toHaveBeenCalled();
    expect(mockApi.createSession).not.toHaveBeenCalled();
  });
});
