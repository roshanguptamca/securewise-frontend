import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mockApi = vi.hoisted(() => ({
  organizations: vi.fn(),
  projects: vi.fn(),
  targets: vi.fn(),
  register: vi.fn(),
  action: vi.fn(),
  authorizations: vi.fn(),
  createScan: vi.fn(),
  startScan: vi.fn(),
}));

vi.mock("../api/client", () => ({
  sw: {
    orgs: { list: mockApi.organizations },
    projects: { list: mockApi.projects },
    applicationTargets: {
      list: mockApi.targets,
      register: mockApi.register,
      action: mockApi.action,
    },
    testingAuthorizations: {
      list: mockApi.authorizations,
      revoke: vi.fn(),
    },
    scans: {
      create: mockApi.createScan,
      start: mockApi.startScan,
    },
  },
}));

import ApplicationTargetsPage from "../pages/applications/ApplicationTargetsPage";

describe("ApplicationTargetsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.organizations.mockResolvedValue({
      data: [{ id: "org-1", name: "Customer" }],
    });
    mockApi.projects.mockResolvedValue({
      data: [{ id: "project-1", organization: "org-1", name: "Storefront" }],
    });
    mockApi.targets.mockResolvedValue({ data: [] });
    mockApi.authorizations.mockResolvedValue({ data: [] });
    mockApi.register.mockResolvedValue({
      data: {
        target: {
          id: "target-1",
          url: "https://app.customer.example/shop",
          hostname: "app.customer.example",
          project: "project-1",
          verified: false,
        },
        challenge: {
          id: "challenge-1",
          method: "dns_txt",
          token: "proof-token",
          dns_name: "_securewise-verification.app.customer.example",
          https_path: "/.well-known/securewise-verification.txt",
          expires_at: new Date(Date.now() + 60_000).toISOString(),
        },
      },
    });
    mockApi.action.mockResolvedValue({ data: {} });
  });

  it("explains the separate ownership proof and requires it before testing approval", async () => {
    render(
      <MemoryRouter>
        <ApplicationTargetsPage />
      </MemoryRouter>,
    );
    await screen.findByRole("heading", { name: "Application Targets" });
    expect(
      screen.getByText(
        /External URL scans are blocked unless the worker advertises restricted egress/,
      ),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Project"), {
      target: { value: "project-1" },
    });
    fireEvent.change(screen.getByLabelText("Exact HTTPS URL"), {
      target: { value: "https://app.customer.example/shop" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Register" }));

    expect(
      await screen.findByText(/Publish a TXT record at/),
    ).toBeInTheDocument();
    expect(screen.getByText("proof-token")).toBeInTheDocument();
    await waitFor(() =>
      expect(mockApi.register).toHaveBeenCalledWith({
        project: "project-1",
        url: "https://app.customer.example/shop",
        verification_method: "dns_txt",
      }),
    );
  });
});
