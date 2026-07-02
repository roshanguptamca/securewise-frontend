/**
 * Tests for ScanPoliciesPage — verifies edit and delete of an existing
 * scan policy (previously only create + set-default were supported).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockPolicy = vi.hoisted(() => ({
  id: "policy-1",
  organization: "org-1",
  project: null,
  name: "Secure Default",
  description: "",
  scan_types: ["sast", "secrets"],
  fail_on_severity: "high",
  max_critical: 0,
  max_high: 5,
  max_medium: -1,
  fail_on_secrets: true,
  fail_on_new_findings_only: false,
  allow_accepted_risks: true,
  allow_false_positives: true,
  schedule_cron: "",
  is_active: true,
  is_default: true,
  created_by: null,
  created_by_detail: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
}));

const mockOrgs = vi.hoisted(() => [{ id: "org-1", name: "Acme" }]);

const mockPolicies = vi.hoisted(() => ({
  list: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  setDefault: vi.fn(),
  create: vi.fn(),
}));

vi.mock("../api/client", () => ({
  sw: {
    policies: mockPolicies,
    orgs: { list: vi.fn().mockResolvedValue({ data: mockOrgs }) },
  },
}));

import ScanPoliciesPage from "../pages/scan-policies/ScanPoliciesPage";

describe("ScanPoliciesPage edit/delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPolicies.list.mockResolvedValue({ data: [mockPolicy] });
  });

  it("renders Edit and Delete actions for each policy", async () => {
    render(<ScanPoliciesPage />);
    await waitFor(() => screen.getByText("Secure Default"));
    expect(screen.getByRole("button", { name: /Edit/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Delete/i })).toBeInTheDocument();
  });

  it("edits a policy via the Edit modal", async () => {
    const user = userEvent.setup();
    mockPolicies.update.mockResolvedValue({
      data: { ...mockPolicy, name: "Renamed Policy" },
    });
    render(<ScanPoliciesPage />);
    await waitFor(() => screen.getByText("Secure Default"));

    await user.click(screen.getByRole("button", { name: /Edit/i }));
    const dialog = await screen.findByText("Edit Policy: Secure Default");
    const modal = dialog.closest(".modal, [role='dialog']") ?? document.body;

    const nameInput = within(modal as HTMLElement).getByDisplayValue(
      "Secure Default",
    );
    await user.clear(nameInput);
    await user.type(nameInput, "Renamed Policy");

    await user.click(
      within(modal as HTMLElement).getByRole("button", {
        name: /Save Changes/i,
      }),
    );

    await waitFor(() => expect(mockPolicies.update).toHaveBeenCalled());
    const [id, payload] = mockPolicies.update.mock.calls[0];
    expect(id).toBe("policy-1");
    expect(payload.name).toBe("Renamed Policy");
  });

  it("deletes a policy after confirmation", async () => {
    const user = userEvent.setup();
    mockPolicies.delete.mockResolvedValue({});
    render(<ScanPoliciesPage />);
    await waitFor(() => screen.getByText("Secure Default"));

    await user.click(screen.getByRole("button", { name: /Delete/i }));
    await screen.findByText("Delete Scan Policy");

    await user.click(screen.getByRole("button", { name: /Delete Policy/i }));

    await waitFor(() =>
      expect(mockPolicies.delete).toHaveBeenCalledWith("policy-1"),
    );
  });
});
