import { expect, test, type Page } from "@playwright/test";

const shotDir = "docs/screenshots/passive-website";
const now = "2026-10-12T21:35:41.000Z";

// Mirrors the real ACC scan 6ccfbac0-... response shape; mocked for UI review only.
const scan = {
  id: "6ccfbac0-f721-466e-87a7-58caad6e6be1",
  organization: "org-1",
  project: "proj-1",
  repository: null,
  policy: null,
  testing_authorization: "auth-1",
  scan_type: "dast",
  branch: "",
  commit_sha: "",
  status: "completed_partial",
  started_at: now,
  completed_at: now,
  duration_seconds: 0,
  error_message: "",
  scanner_metadata: {
    dast: { mode: "passive_only", execution_mode: "authorized_passive_http" },
  },
  quality_gate_passed: null,
  can_retry: true,
  target_url: "https://www.guidewisey.com/",
  finding_counts: {
    critical: 0,
    high: 0,
    medium: 3,
    low: 0,
    info: 0,
    total: 3,
  },
  created_at: now,
  updated_at: now,
  progress: 100,
};
const headers = [
  "x-content-type-options",
  "x-frame-options",
  "content-security-policy",
];
const findings = headers.map((header, i) => ({
  id: `f${i}`,
  scan: scan.id,
  project: "proj-1",
  organization: "org-1",
  title: `Missing ${header
    .split("-")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join("-")
    .replace("Content-Security-Policy", "Content-Security-Policy")} header`,
  description: `The response from https://www.guidewisey.com/ does not set the '${header}' header.`,
  file_path: "",
  line_number: null,
  endpoint: "https://www.guidewisey.com/",
  cwe_id: "CWE-693",
  owasp_category: "A05:2021",
  scanner_type: "dast",
  severity: "medium",
  confidence: "high",
  status: "open",
  risk: "",
  impact: "",
  recommendation: `Add the '${header}' header to all HTTP responses.`,
  bad_code_example: "",
  fixed_code_example: "",
  code_snippet: "",
  evidence: { raw_tool: "requests-passive-dast", missing_header: header },
  fingerprint: `fp${i}`,
  ai_fix_suggestion: "",
  ticket_url: "",
  ticket_created_at: null,
  pr_url: "",
  pr_created_at: null,
  reviewed_by: null,
  reviewed_by_detail: null,
  reviewed_at: null,
  review_note: "",
  occurrence_count: 1,
  created_at: now,
  updated_at: now,
}));

async function mock(page: Page, posts: string[], authActive: boolean) {
  await page.route("**/api/**", async (route) => {
    const { pathname } = new URL(route.request().url());
    if (!pathname.startsWith("/api/")) return route.continue();
    if (route.request().method() === "POST" && !pathname.includes("/accounts/"))
      posts.push(pathname);
    if (pathname.endsWith("/accounts/me/"))
      return route.fulfill({
        json: { id: 1, username: "e2e", email: "e2e@example.test" },
      });
    if (pathname.endsWith("/accounts/csrf/"))
      return route.fulfill({ json: { csrfToken: "t" } });
    if (pathname.endsWith("/testing-authorizations/"))
      return route.fulfill({
        json: [
          {
            id: "auth-1",
            active: authActive,
            approved_scan_methods: ["passive_http"],
          },
        ],
      });
    if (pathname.endsWith("/scans/") && route.request().method() === "POST")
      return route.fulfill({ status: 201, json: { ...scan, id: "new-scan" } });
    if (pathname.endsWith("/start/")) return route.fulfill({ json: {} });
    if (pathname.endsWith("/engine-results/"))
      return route.fulfill({
        json: [
          {
            id: "e1",
            engine: "dast",
            status: "completed",
            started_at: now,
            completed_at: now,
            duration_seconds: 0,
            findings_count: 3,
            skipped_reason: "",
            error_message: "",
            raw_summary: {
              mode: "passive_only",
              raw_tool: "requests-passive-dast",
              execution_mode: "authorized_passive_http",
            },
          },
        ],
      });
    if (pathname.endsWith("/progress/"))
      return route.fulfill({
        json: {
          id: scan.id,
          status: "completed_partial",
          progress: 100,
          findings_count: 3,
          engines: [{ engine: "dast", status: "completed", findings_count: 3 }],
        },
      });
    if (/\/scans\/[^/]+\/$/.test(pathname))
      return route.fulfill({ json: scan });
    if (/\/findings\/f\d\/$/.test(pathname)) {
      const idx = Number(pathname.match(/f(\d)/)![1]);
      return route.fulfill({ json: findings[idx] });
    }
    if (pathname.endsWith("/findings/"))
      return route.fulfill({ json: { results: findings } });
    return route.fulfill({ json: { results: [] } });
  });
}

for (const [name, width, height] of [
  ["desktop", 1280, 900],
  ["mobile", 390, 844],
] as const) {
  test.describe(`passive website results (${name})`, () => {
    test.use({ viewport: { width, height } });

    test("shows passive framing, findings and remediation", async ({
      page,
    }) => {
      await mock(page, [], true);
      await page.goto(`/scans/${scan.id}`);
      await expect(
        page.getByRole("heading", { name: "Passive Website Security Check" }),
      ).toBeVisible();
      await expect(
        page.getByText(/not a full penetration test/i),
      ).toBeVisible();
      await expect(
        page.getByText("Missing X-Frame-Options header"),
      ).toBeVisible();
      await page.screenshot({
        path: `${shotDir}/${name}-scan.png`,
        fullPage: true,
      });

      await page.goto("/findings/f2");
      await expect(page.getByText("Why it matters:")).toBeVisible();
      await expect(
        page.getByText("Content-Security-Policy: default-src"),
      ).toBeVisible();
      await page.screenshot({
        path: `${shotDir}/${name}-finding.png`,
        fullPage: true,
      });
    });
  });
}

test("retest is blocked client-side when authorization expired", async ({
  page,
}) => {
  const posts: string[] = [];
  await mock(page, posts, false);
  await page.goto(`/scans/${scan.id}`);
  await page.getByRole("button", { name: "Retest" }).click();
  await expect(page.getByText(/has expired or was revoked/i)).toBeVisible();
  expect(posts.filter((p) => p.includes("/scans/"))).toEqual([]);
  await page.screenshot({
    path: `${shotDir}/retest-blocked.png`,
    fullPage: true,
  });
});

test("retest creates and starts a new scan when authorized", async ({
  page,
}) => {
  const posts: string[] = [];
  await mock(page, posts, true);
  await page.goto(`/scans/${scan.id}`);
  await page.getByRole("button", { name: "Retest" }).click();
  await expect(page).toHaveURL(/\/scans\/new-scan$/);
  expect(posts.some((p) => p.endsWith("/scans/"))).toBe(true);
  expect(posts.some((p) => p.endsWith("/new-scan/start/"))).toBe(true);
});
