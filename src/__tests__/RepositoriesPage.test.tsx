import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockApi = vi.hoisted(() => ({
  reposList: vi.fn(),
  orgsList: vi.fn(),
  projectsList: vi.fn(),
  integrationsList: vi.fn(),
  installations: vi.fn(),
  appRepositories: vi.fn(),
  selectRepositories: vi.fn(),
}));

vi.mock("../api/client", () => ({
  sw: {
    repos: {
      list: mockApi.reposList,
      testAccess: vi.fn(),
      delete: vi.fn(),
    },
    orgs: { list: mockApi.orgsList },
    projects: { list: mockApi.projectsList },
    gitIntegrations: { list: mockApi.integrationsList },
    githubApp: {
      installations: mockApi.installations,
      repositories: mockApi.appRepositories,
      selectRepositories: mockApi.selectRepositories,
    },
  },
}));

import RepositoriesPage from "../pages/repositories/RepositoriesPage";

describe("GitHub App repository selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.reposList.mockResolvedValue({ data: [] });
    mockApi.orgsList.mockResolvedValue({
      data: [{ id: "org-1", name: "Customer" }],
    });
    mockApi.projectsList.mockResolvedValue({
      data: [{ id: "project-1", organization: "org-1", name: "Storefront" }],
    });
    mockApi.integrationsList.mockResolvedValue({ data: [] });
    mockApi.installations.mockResolvedValue({
      data: [
        {
          id: "installation-1",
          organization: "org-1",
          account_login: "customer",
          suspended: false,
          removed: false,
          available: true,
        },
        {
          id: "installation-2",
          organization: "org-1",
          account_login: "not-available",
          suspended: false,
          removed: false,
          available: false,
        },
      ],
    });
    mockApi.appRepositories.mockResolvedValue({
      data: [
        {
          id: 123,
          full_name: "customer/private-app",
          private: true,
          default_branch: "main",
          html_url: "https://github.com/customer/private-app",
        },
      ],
    });
    mockApi.selectRepositories.mockResolvedValue({ data: [] });
  });

  it("loads and syncs only repositories explicitly selected by the user", async () => {
    const user = userEvent.setup();
    render(<RepositoriesPage />);

    await user.selectOptions(
      await screen.findByLabelText("Connected GitHub account"),
      "installation-1",
    );
    expect(
      screen.queryByRole("option", { name: "not-available" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Load repositories" }));
    const repoCheckbox = await screen.findByRole("checkbox", {
      name: /customer\/private-app/,
    });
    await user.click(repoCheckbox);
    await user.selectOptions(
      screen.getByLabelText("Project (optional)"),
      "project-1",
    );
    await user.click(screen.getByRole("button", { name: "Add 1 selected" }));

    await waitFor(() =>
      expect(mockApi.selectRepositories).toHaveBeenCalledWith({
        installation: "installation-1",
        repository_ids: [123],
        project: "project-1",
      }),
    );
  });
});
