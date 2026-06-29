import axios from "axios";

const BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

// Where to redirect unauthenticated users — main GuideWisey portal login
const LOGIN_URL =
  import.meta.env.VITE_LOGIN_URL ?? "https://www.guidewisey.com/login";

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  withCredentials: true, // send session cookie (same auth as guidewisey.com)
  headers: { "Content-Type": "application/json" },
});

// ── CSRF helper ──────────────────────────────────────────────────────────────
function getCsrfToken(): string {
  return (
    document.cookie
      .split("; ")
      .find((r) => r.startsWith("csrftoken="))
      ?.split("=")?.[1] ?? ""
  );
}

api.interceptors.request.use((cfg) => {
  const csrf = getCsrfToken();
  if (csrf) cfg.headers["X-CSRFToken"] = csrf;
  return cfg;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 || err.response?.status === 403) {
      // Redirect to GuideWisey main portal login, passing return URL
      const returnTo = encodeURIComponent(window.location.href);
      window.location.href = `${LOGIN_URL}?next=${returnTo}`;
    }
    return Promise.reject(err);
  },
);

// ── Helpers ──────────────────────────────────────────────────────────────────
export const sw = {
  // Dashboard
  dashboard: () => api.get("/securewise/dashboard/summary/"),

  // Organizations
  orgs: {
    list: () => api.get("/securewise/organizations/"),
    get: (id: string) => api.get(`/securewise/organizations/${id}/`),
    create: (data: object) => api.post("/securewise/organizations/", data),
    update: (id: string, data: object) =>
      api.patch(`/securewise/organizations/${id}/`, data),
    delete: (id: string) => api.delete(`/securewise/organizations/${id}/`),
  },

  // Members
  members: {
    list: (orgId?: string) =>
      api.get("/securewise/memberships/", {
        params: orgId ? { organization: orgId } : {},
      }),
    add: (data: object) => api.post("/securewise/memberships/", data),
  },

  // Git Integrations
  gitIntegrations: {
    list: (orgId?: string) =>
      api.get("/securewise/git-integrations/", {
        params: orgId ? { organization: orgId } : {},
      }),
    get: (id: string) => api.get(`/securewise/git-integrations/${id}/`),
    create: (data: object) => api.post("/securewise/git-integrations/", data),
    update: (id: string, data: object) =>
      api.patch(`/securewise/git-integrations/${id}/`, data),
    delete: (id: string) => api.delete(`/securewise/git-integrations/${id}/`),
    test: (id: string) => api.post(`/securewise/git-integrations/${id}/test/`),
    listRepos: (id: string) =>
      api.post(`/securewise/git-integrations/${id}/list-repositories/`),
  },

  // Projects
  projects: {
    list: (orgId?: string) =>
      api.get("/securewise/projects/", {
        params: orgId ? { organization: orgId } : {},
      }),
    get: (id: string) => api.get(`/securewise/projects/${id}/`),
    create: (data: object) => api.post("/securewise/projects/", data),
    update: (id: string, data: object) =>
      api.patch(`/securewise/projects/${id}/`, data),
    delete: (id: string) => api.delete(`/securewise/projects/${id}/`),
  },

  // Repositories
  repos: {
    list: (params?: object) => api.get("/securewise/repositories/", { params }),
    get: (id: string) => api.get(`/securewise/repositories/${id}/`),
    create: (data: object) => api.post("/securewise/repositories/", data),
    update: (id: string, data: object) =>
      api.patch(`/securewise/repositories/${id}/`, data),
    delete: (id: string) => api.delete(`/securewise/repositories/${id}/`),
    validate: (data: object) =>
      api.post("/securewise/repositories/validate/", data),
    testAccess: (id: string) =>
      api.post(`/securewise/repositories/${id}/test-access/`),
  },

  // Scan Policies
  policies: {
    list: (params?: object) =>
      api.get("/securewise/scan-policies/", { params }),
    get: (id: string) => api.get(`/securewise/scan-policies/${id}/`),
    create: (data: object) => api.post("/securewise/scan-policies/", data),
    update: (id: string, data: object) =>
      api.patch(`/securewise/scan-policies/${id}/`, data),
    delete: (id: string) => api.delete(`/securewise/scan-policies/${id}/`),
  },

  // Scans
  scans: {
    list: (params?: object) => api.get("/securewise/scans/", { params }),
    get: (id: string) => api.get(`/securewise/scans/${id}/`),
    create: (data: object) => api.post("/securewise/scans/", data),
    start: (id: string) => api.post(`/securewise/scans/${id}/start/`),
    cancel: (id: string) => api.post(`/securewise/scans/${id}/cancel/`),
  },

  // Findings
  findings: {
    list: (params?: object) => api.get("/securewise/findings/", { params }),
    get: (id: string) => api.get(`/securewise/findings/${id}/`),
    update: (id: string, data: object) =>
      api.patch(`/securewise/findings/${id}/`, data),
    acceptRisk: (id: string, note?: string) =>
      api.post(`/securewise/findings/${id}/accept-risk/`, { note }),
    markFalsePositive: (id: string, note?: string) =>
      api.post(`/securewise/findings/${id}/mark-false-positive/`, { note }),
  },

  // Reports
  reports: {
    list: (params?: object) => api.get("/securewise/reports/", { params }),
    get: (id: string) => api.get(`/securewise/reports/${id}/`),
    create: (data: object) => api.post("/securewise/reports/", data),
  },

  // Integrations (external tools)
  integrations: {
    list: (orgId?: string) =>
      api.get("/securewise/integrations/", {
        params: orgId ? { organization: orgId } : {},
      }),
    create: (data: object) => api.post("/securewise/integrations/", data),
    update: (id: string, data: object) =>
      api.patch(`/securewise/integrations/${id}/`, data),
    delete: (id: string) => api.delete(`/securewise/integrations/${id}/`),
  },

  // Audit logs
  auditLogs: {
    list: (orgId?: string) =>
      api.get("/securewise/audit-logs/", {
        params: orgId ? { organization: orgId } : {},
      }),
  },
};

export default api;
