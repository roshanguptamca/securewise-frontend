import type { Scan } from "../../types";

export const PASSIVE_EXECUTION_MODE = "authorized_passive_http";

interface EngineLike {
  engine: unknown;
  status: unknown;
  raw_summary?: Record<string, unknown>;
}

/** True when the DAST engine ran the authorized passive HTTP check. */
export function isPassiveWebsiteScan(
  scan: Pick<Scan, "scan_type" | "target_url">,
  engines: EngineLike[],
): boolean {
  if (scan.scan_type !== "dast" || !scan.target_url) return false;
  return engines.some(
    (row) =>
      row.engine === "dast" &&
      row.raw_summary?.execution_mode === PASSIVE_EXECUTION_MODE,
  );
}

export interface HeaderGuidance {
  why: string;
  example: string;
}

const HEADER_GUIDANCE: Record<string, HeaderGuidance> = {
  "x-content-type-options": {
    why: "Stops browsers from guessing file types, which can turn an uploaded or reflected file into runnable script.",
    example: "X-Content-Type-Options: nosniff",
  },
  "x-frame-options": {
    why: "Stops other sites from embedding your pages in a frame (clickjacking). A CSP frame-ancestors rule is the modern equivalent.",
    example: "X-Frame-Options: DENY",
  },
  "content-security-policy": {
    why: "Limits where scripts and other content can load from, which reduces the impact of cross-site scripting.",
    example:
      "Content-Security-Policy: default-src 'self'; frame-ancestors 'none'",
  },
};

export function headerGuidance(evidence: unknown): HeaderGuidance | null {
  if (!evidence || typeof evidence !== "object") return null;
  const header = (evidence as Record<string, unknown>).missing_header;
  if (typeof header !== "string") return null;
  return HEADER_GUIDANCE[header.toLowerCase()] ?? null;
}
