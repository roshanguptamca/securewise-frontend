/**
 * Tests for ScansPage's CreateScanModal — verifies the conditional
 * target_url / api_spec_url / docker_image fields only render for the
 * relevant scan_type selections (production scanning UX extension).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

vi.mock("../api/client", () => {
  const mockOrgs = [{ id: "org-1", name: "Acme" }];
  const mockProjects = [
    { id: "proj-1", name: "Web App", organization: "org-1" },
  ];
  const mockRepositories = [
    {
      id: "repo-1",
      name: "web-app",
      organization: "org-1",
      project: "proj-1",
      repository_url: "https://github.com/acme/web-app",
    },
  ];
  return {
    sw: {
      scans: {
        list: vi.fn().mockResolvedValue({ data: [] }),
        create: vi.fn().mockResolvedValue({ data: { id: "scan-1" } }),
        start: vi.fn().mockResolvedValue({ data: {} }),
      },
      projects: { list: vi.fn().mockResolvedValue({ data: mockProjects }) },
      orgs: { list: vi.fn().mockResolvedValue({ data: mockOrgs }) },
      repos: {
        list: vi.fn().mockResolvedValue({ data: mockRepositories }),
      },
    },
  };
});

import ScansPage from "../pages/scans/ScansPage";

describe("CreateScanModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function openModal() {
    render(
      <MemoryRouter>
        <ScansPage />
      </MemoryRouter>,
    );
    await waitFor(() => screen.getByText("+ New Scan"));
    await userEvent.click(screen.getByText("+ New Scan"));
    await waitFor(() => screen.getByText("Start New Scan"));
  }

  it("hides target_url field by default (scan_type=sast)", async () => {
    await openModal();
    expect(screen.queryByLabelText(/Target URL/i)).not.toBeInTheDocument();
  });

  it("shows target_url field when scan_type=dast", async () => {
    await openModal();
    const select = screen.getByLabelText("Scan Type") as HTMLSelectElement;
    await userEvent.selectOptions(select, "dast");
    expect(screen.getByLabelText(/Target URL/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Only scan targets you own or are authorized/i),
    ).toBeInTheDocument();
  });

  it("shows api_spec_url field when scan_type=api", async () => {
    await openModal();
    const select = screen.getByLabelText("Scan Type") as HTMLSelectElement;
    await userEvent.selectOptions(select, "api");
    expect(screen.getByLabelText(/OpenAPI\/Swagger URL/i)).toBeInTheDocument();
  });

  it("shows docker_image field when scan_type=container", async () => {
    await openModal();
    const select = screen.getByLabelText("Scan Type") as HTMLSelectElement;
    await userEvent.selectOptions(select, "container");
    expect(screen.getByLabelText(/Docker Image/i)).toBeInTheDocument();
  });

  it("shows all conditional fields and full-scan notice when scan_type=full", async () => {
    await openModal();
    const select = screen.getByLabelText("Scan Type") as HTMLSelectElement;
    await userEvent.selectOptions(select, "full");
    expect(screen.getByLabelText(/Target URL/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/OpenAPI\/Swagger URL/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Docker Image/i)).toBeInTheDocument();
    expect(screen.getByText(/Full Scan will run/i)).toBeInTheDocument();
  });

  it("no longer shows the old MVP mock scanner disclaimer", async () => {
    await openModal();
    expect(screen.queryByText(/mock scanner/i)).not.toBeInTheDocument();
    expect(screen.getByText(/real scanning engines/i)).toBeInTheDocument();
  });
});
