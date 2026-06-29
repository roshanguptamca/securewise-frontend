/**
 * Additional coverage for sw.* API helpers not tested in client.test.ts.
 * Ensures all helper arrow functions are invoked to meet the 80% function coverage threshold.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

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
  return { default: { create: vi.fn(() => mockInstance) } };
});

import { sw } from "../api/client";
import axios from "axios";

const mockAxios = (axios.create as ReturnType<typeof vi.fn>)();

describe("sw API helpers — full coverage", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── members ──────────────────────────────────────────────────────────────
  it("members.list() without orgId", () => {
    sw.members.list();
    expect(mockAxios.get).toHaveBeenCalledWith("/securewise/memberships/", {
      params: {},
    });
  });

  it("members.list(orgId) passes organization param", () => {
    sw.members.list("org-1");
    expect(mockAxios.get).toHaveBeenCalledWith("/securewise/memberships/", {
      params: { organization: "org-1" },
    });
  });

  it("members.add() calls POST /securewise/memberships/", () => {
    sw.members.add({ user: "u1", role: "developer" });
    expect(mockAxios.post).toHaveBeenCalledWith("/securewise/memberships/", {
      user: "u1",
      role: "developer",
    });
  });

  // ── gitIntegrations ───────────────────────────────────────────────────────
  it("gitIntegrations.list() without orgId", () => {
    sw.gitIntegrations.list();
    expect(mockAxios.get).toHaveBeenCalledWith(
      "/securewise/git-integrations/",
      { params: {} },
    );
  });

  it("gitIntegrations.list(orgId) passes organization param", () => {
    sw.gitIntegrations.list("org-2");
    expect(mockAxios.get).toHaveBeenCalledWith(
      "/securewise/git-integrations/",
      { params: { organization: "org-2" } },
    );
  });

  it("gitIntegrations.get(id)", () => {
    sw.gitIntegrations.get("gi-1");
    expect(mockAxios.get).toHaveBeenCalledWith(
      "/securewise/git-integrations/gi-1/",
    );
  });

  it("gitIntegrations.create()", () => {
    sw.gitIntegrations.create({ provider: "github" });
    expect(mockAxios.post).toHaveBeenCalledWith(
      "/securewise/git-integrations/",
      { provider: "github" },
    );
  });

  it("gitIntegrations.update(id)", () => {
    sw.gitIntegrations.update("gi-1", { name: "Updated" });
    expect(mockAxios.patch).toHaveBeenCalledWith(
      "/securewise/git-integrations/gi-1/",
      { name: "Updated" },
    );
  });

  it("gitIntegrations.delete(id)", () => {
    sw.gitIntegrations.delete("gi-1");
    expect(mockAxios.delete).toHaveBeenCalledWith(
      "/securewise/git-integrations/gi-1/",
    );
  });

  it("gitIntegrations.listRepos(id)", () => {
    sw.gitIntegrations.listRepos("gi-1");
    expect(mockAxios.post).toHaveBeenCalledWith(
      "/securewise/git-integrations/gi-1/list-repositories/",
    );
  });

  // ── projects ──────────────────────────────────────────────────────────────
  it("projects.get(id)", () => {
    sw.projects.get("p-1");
    expect(mockAxios.get).toHaveBeenCalledWith("/securewise/projects/p-1/");
  });

  it("projects.create()", () => {
    sw.projects.create({ name: "Project Alpha" });
    expect(mockAxios.post).toHaveBeenCalledWith("/securewise/projects/", {
      name: "Project Alpha",
    });
  });

  it("projects.update(id)", () => {
    sw.projects.update("p-1", { name: "Updated" });
    expect(mockAxios.patch).toHaveBeenCalledWith("/securewise/projects/p-1/", {
      name: "Updated",
    });
  });

  it("projects.delete(id)", () => {
    sw.projects.delete("p-1");
    expect(mockAxios.delete).toHaveBeenCalledWith("/securewise/projects/p-1/");
  });

  // ── repos ──────────────────────────────────────────────────────────────
  it("repos.get(id)", () => {
    sw.repos.get("r-1");
    expect(mockAxios.get).toHaveBeenCalledWith("/securewise/repositories/r-1/");
  });

  it("repos.create()", () => {
    sw.repos.create({ url: "https://github.com/org/repo" });
    expect(mockAxios.post).toHaveBeenCalledWith("/securewise/repositories/", {
      url: "https://github.com/org/repo",
    });
  });

  it("repos.update(id)", () => {
    sw.repos.update("r-1", { default_branch: "develop" });
    expect(mockAxios.patch).toHaveBeenCalledWith(
      "/securewise/repositories/r-1/",
      { default_branch: "develop" },
    );
  });

  it("repos.delete(id)", () => {
    sw.repos.delete("r-1");
    expect(mockAxios.delete).toHaveBeenCalledWith(
      "/securewise/repositories/r-1/",
    );
  });

  // ── policies ──────────────────────────────────────────────────────────────
  it("policies.get(id)", () => {
    sw.policies.get("pol-1");
    expect(mockAxios.get).toHaveBeenCalledWith(
      "/securewise/scan-policies/pol-1/",
    );
  });

  it("policies.create()", () => {
    sw.policies.create({ name: "Policy A" });
    expect(mockAxios.post).toHaveBeenCalledWith("/securewise/scan-policies/", {
      name: "Policy A",
    });
  });

  it("policies.update(id)", () => {
    sw.policies.update("pol-1", { name: "Updated" });
    expect(mockAxios.patch).toHaveBeenCalledWith(
      "/securewise/scan-policies/pol-1/",
      { name: "Updated" },
    );
  });

  it("policies.delete(id)", () => {
    sw.policies.delete("pol-1");
    expect(mockAxios.delete).toHaveBeenCalledWith(
      "/securewise/scan-policies/pol-1/",
    );
  });

  // ── scans ─────────────────────────────────────────────────────────────────
  it("scans.get(id)", () => {
    sw.scans.get("s-1");
    expect(mockAxios.get).toHaveBeenCalledWith("/securewise/scans/s-1/");
  });

  it("scans.create()", () => {
    sw.scans.create({ project: "p-1", scan_type: "sast" });
    expect(mockAxios.post).toHaveBeenCalledWith("/securewise/scans/", {
      project: "p-1",
      scan_type: "sast",
    });
  });

  // ── findings ─────────────────────────────────────────────────────────────
  it("findings.get(id)", () => {
    sw.findings.get("f-1");
    expect(mockAxios.get).toHaveBeenCalledWith("/securewise/findings/f-1/");
  });

  it("findings.update(id)", () => {
    sw.findings.update("f-1", { status: "fixed" });
    expect(mockAxios.patch).toHaveBeenCalledWith("/securewise/findings/f-1/", {
      status: "fixed",
    });
  });

  // ── reports ───────────────────────────────────────────────────────────────
  it("reports.get(id)", () => {
    sw.reports.get("rep-1");
    expect(mockAxios.get).toHaveBeenCalledWith("/securewise/reports/rep-1/");
  });

  it("reports.create()", () => {
    sw.reports.create({ project: "p-1" });
    expect(mockAxios.post).toHaveBeenCalledWith("/securewise/reports/", {
      project: "p-1",
    });
  });

  // ── integrations ─────────────────────────────────────────────────────────
  it("integrations.list() without orgId", () => {
    sw.integrations.list();
    expect(mockAxios.get).toHaveBeenCalledWith("/securewise/integrations/", {
      params: {},
    });
  });

  it("integrations.list(orgId)", () => {
    sw.integrations.list("org-1");
    expect(mockAxios.get).toHaveBeenCalledWith("/securewise/integrations/", {
      params: { organization: "org-1" },
    });
  });

  it("integrations.create()", () => {
    sw.integrations.create({ type: "jira" });
    expect(mockAxios.post).toHaveBeenCalledWith("/securewise/integrations/", {
      type: "jira",
    });
  });

  it("integrations.update(id)", () => {
    sw.integrations.update("int-1", { enabled: false });
    expect(mockAxios.patch).toHaveBeenCalledWith(
      "/securewise/integrations/int-1/",
      { enabled: false },
    );
  });

  it("integrations.delete(id)", () => {
    sw.integrations.delete("int-1");
    expect(mockAxios.delete).toHaveBeenCalledWith(
      "/securewise/integrations/int-1/",
    );
  });

  // ── auditLogs ─────────────────────────────────────────────────────────────
  it("auditLogs.list() without orgId", () => {
    sw.auditLogs.list();
    expect(mockAxios.get).toHaveBeenCalledWith("/securewise/audit-logs/", {
      params: {},
    });
  });

  it("auditLogs.list(orgId)", () => {
    sw.auditLogs.list("org-1");
    expect(mockAxios.get).toHaveBeenCalledWith("/securewise/audit-logs/", {
      params: { organization: "org-1" },
    });
  });
});
