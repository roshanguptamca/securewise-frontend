/**
 * Tests for the API client helper object (sw.*).
 * Verifies that each helper calls the correct axios method + URL.
 * Mocks axios so no network calls are made.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock axios before importing client
vi.mock("axios", () => {
  const mockInstance = {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    patch: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    defaults: { headers: { common: {} } },
  };
  return {
    default: {
      create: vi.fn(() => mockInstance),
    },
  };
});

import { sw } from "../api/client";

// Grab the mock instance created by axios.create()
import axios from "axios";
const mockAxios = (axios.create as ReturnType<typeof vi.fn>)();

describe("sw API helpers — URLs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sw.dashboard() calls GET /securewise/dashboard/summary/", () => {
    sw.dashboard();
    expect(mockAxios.get).toHaveBeenCalledWith(
      "/securewise/dashboard/summary/",
    );
  });

  it("sw.orgs.list() calls GET /securewise/organizations/", () => {
    sw.orgs.list();
    expect(mockAxios.get).toHaveBeenCalledWith("/securewise/organizations/");
  });

  it("sw.orgs.get(id) calls GET with correct path", () => {
    sw.orgs.get("abc-123");
    expect(mockAxios.get).toHaveBeenCalledWith(
      "/securewise/organizations/abc-123/",
    );
  });

  it("sw.orgs.create() calls POST /securewise/organizations/", () => {
    sw.orgs.create({ name: "Acme" });
    expect(mockAxios.post).toHaveBeenCalledWith("/securewise/organizations/", {
      name: "Acme",
    });
  });

  it("sw.orgs.update(id) calls PATCH with correct path", () => {
    sw.orgs.update("abc-123", { name: "Updated" });
    expect(mockAxios.patch).toHaveBeenCalledWith(
      "/securewise/organizations/abc-123/",
      { name: "Updated" },
    );
  });

  it("sw.orgs.delete(id) calls DELETE with correct path", () => {
    sw.orgs.delete("abc-123");
    expect(mockAxios.delete).toHaveBeenCalledWith(
      "/securewise/organizations/abc-123/",
    );
  });

  it("sw.projects.list() calls GET /securewise/projects/", () => {
    sw.projects.list();
    expect(mockAxios.get).toHaveBeenCalledWith("/securewise/projects/", {
      params: {},
    });
  });

  it("sw.projects.list(orgId) passes organization param", () => {
    sw.projects.list("org-1");
    expect(mockAxios.get).toHaveBeenCalledWith("/securewise/projects/", {
      params: { organization: "org-1" },
    });
  });

  it("sw.scans.list() calls GET /securewise/scans/", () => {
    sw.scans.list();
    expect(mockAxios.get).toHaveBeenCalledWith("/securewise/scans/", {
      params: undefined,
    });
  });

  it("sw.scans.start(id) calls POST start action", () => {
    sw.scans.start("scan-1");
    expect(mockAxios.post).toHaveBeenCalledWith(
      "/securewise/scans/scan-1/start/",
    );
  });

  it("sw.scans.cancel(id) calls POST cancel action", () => {
    sw.scans.cancel("scan-1");
    expect(mockAxios.post).toHaveBeenCalledWith(
      "/securewise/scans/scan-1/cancel/",
    );
  });

  it("sw.findings.list() calls GET /securewise/findings/", () => {
    sw.findings.list();
    expect(mockAxios.get).toHaveBeenCalledWith("/securewise/findings/", {
      params: undefined,
    });
  });

  it("sw.findings.acceptRisk(id) calls POST accept-risk action", () => {
    sw.findings.acceptRisk("f-1");
    expect(mockAxios.post).toHaveBeenCalledWith(
      "/securewise/findings/f-1/accept-risk/",
      { note: undefined },
    );
  });

  it("sw.findings.acceptRisk(id, note) passes note in body", () => {
    sw.findings.acceptRisk("f-1", "Accepted for business reasons");
    expect(mockAxios.post).toHaveBeenCalledWith(
      "/securewise/findings/f-1/accept-risk/",
      { note: "Accepted for business reasons" },
    );
  });

  it("sw.findings.markFalsePositive(id) calls POST mark-false-positive action", () => {
    sw.findings.markFalsePositive("f-1");
    expect(mockAxios.post).toHaveBeenCalledWith(
      "/securewise/findings/f-1/mark-false-positive/",
      { note: undefined },
    );
  });

  it("sw.findings.markFalsePositive(id, note) passes note in body", () => {
    sw.findings.markFalsePositive("f-1", "Not exploitable here");
    expect(mockAxios.post).toHaveBeenCalledWith(
      "/securewise/findings/f-1/mark-false-positive/",
      { note: "Not exploitable here" },
    );
  });

  it("sw.reports.list() calls GET /securewise/reports/", () => {
    sw.reports.list();
    expect(mockAxios.get).toHaveBeenCalledWith("/securewise/reports/", {
      params: undefined,
    });
  });

  it("sw.gitIntegrations.test(id) calls POST test action", () => {
    sw.gitIntegrations.test("gi-1");
    expect(mockAxios.post).toHaveBeenCalledWith(
      "/securewise/git-integrations/gi-1/test/",
    );
  });

  it("sw.repos.validate() calls POST /securewise/repositories/validate/", () => {
    sw.repos.validate({ url: "https://github.com/org/repo" });
    expect(mockAxios.post).toHaveBeenCalledWith(
      "/securewise/repositories/validate/",
      { url: "https://github.com/org/repo" },
    );
  });

  it("sw.repos.testAccess(id) calls POST test-access action", () => {
    sw.repos.testAccess("repo-1");
    expect(mockAxios.post).toHaveBeenCalledWith(
      "/securewise/repositories/repo-1/test-access/",
    );
  });

  it("sw.policies.list() calls GET /securewise/scan-policies/", () => {
    sw.policies.list();
    expect(mockAxios.get).toHaveBeenCalledWith("/securewise/scan-policies/", {
      params: undefined,
    });
  });
});
