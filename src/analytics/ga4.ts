const DEFAULT_MEASUREMENT_ID = "G-S5ZLBGRJD4";
const GA_SCRIPT_SRC = "https://www.googletagmanager.com/gtag/js";
const REDACTED_SEGMENT = ":id";
const PAGE_TITLE = "SecureWise";
const RESERVED_EVENT_PARAMETERS = new Set([
  "page_location",
  "page_path",
  "page_referrer",
  "page_title",
]);

type EventParameters = Record<string, string | number | boolean>;

type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

let initialized = false;
let initializationPromise: Promise<boolean> | undefined;
let lastPageViewKey: string | undefined;

function isValidMeasurementId(value: string) {
  return /^G-[A-Z0-9]+$/i.test(value);
}

function getMeasurementId() {
  return (
    import.meta.env.VITE_GA4_MEASUREMENT_ID?.trim() || DEFAULT_MEASUREMENT_ID
  );
}

function isProductionEnvironment() {
  const deploymentEnvironment =
    import.meta.env.VITE_DEPLOYMENT_ENV?.trim().toLowerCase() ||
    import.meta.env.VITE_VERCEL_ENV?.trim().toLowerCase();
  return import.meta.env.PROD || deploymentEnvironment === "production";
}

function getGtag(): Gtag {
  window.dataLayer ??= [];
  window.gtag ??= (...args: unknown[]) => {
    window.dataLayer?.push(args);
  };
  return window.gtag;
}

function loadScript(measurementId: string) {
  const existingScript = document.querySelector<HTMLScriptElement>(
    `script[src^="${GA_SCRIPT_SRC}"]`,
  );
  if (existingScript) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.async = true;
    script.src = `${GA_SCRIPT_SRC}?id=${encodeURIComponent(measurementId)}`;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Google Analytics failed to load")),
      { once: true },
    );
    document.head.appendChild(script);
  });
}

function isSensitiveSegment(segment: string) {
  return (
    segment.includes("@") ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      segment,
    ) ||
    (segment.length >= 20 &&
      /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)?$/.test(segment)) ||
    /^[A-Za-z0-9_-]{24,}$/.test(segment) ||
    /^\d{4,}$/.test(segment)
  );
}

export function sanitizePath(pathname: string) {
  const path = pathname.split(/[?#]/, 1)[0] || "/";
  if (path === "/") {
    return "/dashboard";
  }

  const segments = path
    .split("/")
    .filter(Boolean)
    .map((segment) =>
      isSensitiveSegment(segment) ? REDACTED_SEGMENT : segment,
    );
  return `/${segments.join("/")}`;
}

export function sanitizeLocation(location: Location) {
  return `${location.origin}${sanitizePath(location.pathname)}`;
}

function getPageContext(pathname = window.location.pathname) {
  const pagePath = sanitizePath(pathname);
  return {
    page_path: pagePath,
    page_location: `${window.location.origin}${pagePath}`,
    page_referrer: "",
    page_title: PAGE_TITLE,
  };
}

function isSensitiveValue(value: string) {
  return (
    value.includes("@") ||
    /[?#&=]/.test(value) ||
    /^https?:\/\//i.test(value) ||
    value.split("/").some((segment) => isSensitiveSegment(segment))
  );
}

export function sanitizeEventParameters(parameters: EventParameters) {
  const sanitized: EventParameters = {};
  for (const [key, value] of Object.entries(parameters)) {
    if (
      RESERVED_EVENT_PARAMETERS.has(key) ||
      !/^[a-z][a-z0-9_]{0,39}$/.test(key) ||
      (typeof value === "string" && isSensitiveValue(value))
    ) {
      continue;
    }
    sanitized[key] = typeof value === "string" ? value.slice(0, 100) : value;
  }
  return sanitized;
}

export function initializeAnalytics() {
  if (initialized) {
    return Promise.resolve(true);
  }
  if (initializationPromise) {
    return initializationPromise;
  }
  const measurementId = getMeasurementId();
  if (
    typeof window === "undefined" ||
    !isProductionEnvironment() ||
    !isValidMeasurementId(measurementId)
  ) {
    return Promise.resolve(false);
  }

  initializationPromise = loadScript(measurementId)
    .then(() => {
      const gtag = getGtag();
      gtag("js", new Date());
      gtag("config", measurementId, {
        ...getPageContext(),
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
      });
      initialized = true;
      return true;
    })
    .catch(() => false);

  return initializationPromise;
}

export async function trackPageView(pathname = window.location.pathname) {
  if (!(await initializeAnalytics())) {
    return false;
  }

  const pageContext = getPageContext(pathname);
  const pageViewKey = pageContext.page_location;
  if (lastPageViewKey === pageViewKey) {
    return false;
  }

  const gtag = getGtag();
  gtag("set", pageContext);
  gtag("event", "page_view", pageContext);
  lastPageViewKey = pageViewKey;
  return true;
}

export async function trackEvent(
  name: string,
  parameters: EventParameters = {},
) {
  if (!(await initializeAnalytics()) || !/^[a-z][a-z0-9_]{0,39}$/.test(name)) {
    return false;
  }

  getGtag()("event", name, {
    ...sanitizeEventParameters(parameters),
    ...getPageContext(),
  });
  return true;
}

export function resetAnalyticsForTests() {
  initialized = false;
  initializationPromise = undefined;
  lastPageViewKey = undefined;
}
