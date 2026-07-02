import axios from "axios";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";

const BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

const LOGIN_URL =
  import.meta.env.VITE_LOGIN_URL ?? "https://www.guidewisey.com/login";

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  withCredentials: true, // send session cookie (same auth as guidewisey.com)
  headers: { "Content-Type": "application/json" },
});

// ── CSRF helpers ──────────────────────────────────────────────────────────────
// Django's CSRF_COOKIE_DOMAIN is unset, so the csrftoken cookie set by
// api.guidewisey.com is scoped to that exact host and is NOT readable via
// document.cookie on this origin (securewise.guidewisey.com) — it is a
// different (sub)domain as far as cookie visibility from JS goes. Reading
// only document.cookie therefore silently produces an empty CSRF header,
// which the backend rejects with 403. The backend's /accounts/csrf/ endpoint
// (the same one gw-frontend's ensureCSRF() helper uses) also returns the
// token directly in its JSON body for exactly this reason, so we fetch it
// from there instead of relying on a readable cookie.
let cachedCsrfToken = "";

function readCsrfCookie(): string {
  return (
    document.cookie
      .split("; ")
      .find((r) => r.startsWith("csrftoken="))
      ?.split("=")?.[1] ?? ""
  );
}

// Exposed for tests only — resets the module-level cache between test cases.
export function __resetCsrfCacheForTests(): void {
  cachedCsrfToken = "";
}

async function fetchCsrfToken(): Promise<string> {
  try {
    const res = await api.get("/accounts/csrf/");
    cachedCsrfToken = res.data?.csrfToken || readCsrfCookie() || "";
  } catch {
    cachedCsrfToken = readCsrfCookie() || "";
  }
  return cachedCsrfToken;
}

const MUTATING_METHODS = new Set(["post", "put", "patch", "delete"]);

api.interceptors.request.use(async (cfg) => {
  const method = (cfg.method || "get").toLowerCase();
  if (MUTATING_METHODS.has(method)) {
    const csrf =
      cachedCsrfToken || readCsrfCookie() || (await fetchCsrfToken());
    if (csrf) cfg.headers["X-CSRFToken"] = csrf;
  }
  return cfg;
});

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const config = err.config as
      (InternalAxiosRequestConfig & { _csrfRetry?: boolean }) | undefined;
    const status = err.response?.status;
    const method = (config?.method || "").toLowerCase();

    // A 403 on a mutating request is very likely a missing/stale CSRF token
    // (see the cross-origin cookie note above, or the cached token simply
    // expired/rotated). Fetch a fresh token directly from the backend and
    // retry exactly once before giving up.
    if (
      status === 403 &&
      config &&
      !config._csrfRetry &&
      MUTATING_METHODS.has(method)
    ) {
      config._csrfRetry = true;
      const csrf = await fetchCsrfToken();
      if (csrf) {
        config.headers = config.headers ?? {};
        config.headers["X-CSRFToken"] = csrf;
        return api.request(config);
      }
    }

    if (status === 401 || status === 403) {
      // A logout call failing (even after the CSRF retry above) must never bounce the
      // user to the login screen — AuthContext's own logout() catch/finally handles
      // clearing local state and redirecting to the GuideWisey homepage instead.
      const isLogoutCall = (config?.url || "").includes("/accounts/logout/");
      if (!isLogoutCall) {
        // Redirect to GuideWisey main portal login, passing return URL
        const returnTo = encodeURIComponent(window.location.href);
        window.location.href = `${LOGIN_URL}?next=${returnTo}`;
      }
    }
    return Promise.reject(err);
  },
);

export { fetchCsrfToken };

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
    setDefault: (id: string) =>
      api.post(`/securewise/scan-policies/${id}/set-default/`),
  },

  // Scans
  scans: {
    list: (params?: object) => api.get("/securewise/scans/", { params }),
    get: (id: string) => api.get(`/securewise/scans/${id}/`),
    create: (data: object) => api.post("/securewise/scans/", data),
    start: (id: string) => api.post(`/securewise/scans/${id}/start/`),
    retry: (id: string) => api.post(`/securewise/scans/${id}/retry/`),
    cancel: (id: string) => api.post(`/securewise/scans/${id}/cancel/`),
    progress: (id: string) => api.get(`/securewise/scans/${id}/progress/`),
    engineResults: (id: string) =>
      api.get(`/securewise/scans/${id}/engine-results/`),
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
    aiSuggestion: (id: string, force?: boolean) =>
      api.post(
        `/securewise/findings/${id}/ai-suggestion/`,
        {},
        { params: force ? { force: true } : {} },
      ),
  },

  // Reports
  reports: {
    list: (params?: object) => api.get("/securewise/reports/", { params }),
    get: (id: string) => api.get(`/securewise/reports/${id}/`),
    create: (data: object) => api.post("/securewise/reports/", data),
    // Alias for create — supports the richer `report_type` field
    // (owasp_top10, cwe_top25, security_summary, executive_summary,
    // developer_remediation, quality_gate) added alongside `format`.
    generate: (data: object) => api.post("/securewise/reports/", data),
    htmlUrl: (id: string) =>
      `${api.defaults.baseURL}/securewise/reports/${id}/html/`,
    pdfUrl: (id: string) =>
      `${api.defaults.baseURL}/securewise/reports/${id}/pdf/`,
    pdf: (id: string) =>
      api.get(`/securewise/reports/${id}/pdf/`, { responseType: "blob" }),
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
