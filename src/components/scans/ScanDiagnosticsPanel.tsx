import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Copy } from "lucide-react";

import type { ScanDiagnostics } from "../../types";

interface ScanDiagnosticsPanelProps {
  title: string;
  summary: string;
  diagnostics?: ScanDiagnostics | null;
  suggestedAction?: string;
  retryable?: boolean | null;
}

function useCopyReset() {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1400);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return [copied, setCopied] as const;
}

export function ScanDiagnosticsPanel({
  title,
  summary,
  diagnostics,
  suggestedAction,
  retryable,
}: ScanDiagnosticsPanelProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useCopyReset();

  const logExcerpt = useMemo(
    () => diagnostics?.log_excerpt?.trim() ?? "",
    [diagnostics],
  );
  const stage = diagnostics?.stage?.trim() ?? "";
  const rootCause = diagnostics?.root_cause?.trim() ?? "";
  const retryableLabel =
    typeof retryable === "boolean" ? (retryable ? "yes" : "no") : "unknown";
  const hasDiagnostics = Boolean(logExcerpt || stage || rootCause);

  const handleCopy = async () => {
    if (!logExcerpt) return;
    try {
      await navigator.clipboard.writeText(logExcerpt);
      setCopied(true);
    } catch {
      // Clipboard access can be blocked by browser policy. Keep the panel usable.
    }
  };

  return (
    <section className="glass-card" style={{ overflow: "hidden" }}>
      <button
        type="button"
        className="sw-nav-item"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        style={{
          width: "100%",
          borderBottom: open ? "1px solid var(--gw-border)" : "none",
          borderRadius: 0,
          justifyContent: "space-between",
          padding: "1rem 1.25rem",
        }}
      >
        <span className="flex items-center gap-3" style={{ minWidth: 0 }}>
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span style={{ textAlign: "left" }}>
            <span
              className="text-sm font-semibold"
              style={{ display: "block", color: "var(--gw-text-primary)" }}
            >
              {title}
            </span>
            <span className="text-xs text-muted" style={{ display: "block" }}>
              {summary}
            </span>
          </span>
        </span>
        <span className="badge badge-info" style={{ marginLeft: 12 }}>
          {open ? "Hide details" : "Show details"}
        </span>
      </button>

      {open && (
        <div style={{ padding: "1rem 1.25rem 1.25rem" }}>
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            }}
          >
            {stage && (
              <div className="glass-card-sm" style={{ padding: "0.9rem 1rem" }}>
                <div className="text-xs text-muted mb-1">Failed stage</div>
                <div className="text-sm text-primary font-semibold">
                  {stage}
                </div>
              </div>
            )}
            {rootCause && (
              <div className="glass-card-sm" style={{ padding: "0.9rem 1rem" }}>
                <div className="text-xs text-muted mb-1">Cause</div>
                <div className="text-sm text-primary">{rootCause}</div>
              </div>
            )}
            <div className="glass-card-sm" style={{ padding: "0.9rem 1rem" }}>
              <div className="text-xs text-muted mb-1">Retryable</div>
              <div className="text-sm text-primary">{retryableLabel}</div>
            </div>
          </div>

          {suggestedAction && (
            <div className="alert alert-warning mt-4">
              <span>⚠️</span>
              <span>
                <strong>Suggested action:</strong> {suggestedAction}
              </span>
            </div>
          )}

          <div
            className="flex items-center justify-between mt-4 mb-2"
            style={{ gap: 12 }}
          >
            <div>
              <div className="text-xs text-muted">Diagnostics</div>
              <div className="text-sm text-primary">
                Sanitized log excerpt from the backend
              </div>
            </div>
            {logExcerpt && (
              <button
                type="button"
                className="btn-icon"
                onClick={handleCopy}
                aria-label="Copy diagnostics log excerpt"
                title="Copy diagnostics log excerpt"
              >
                <Copy size={14} />
              </button>
            )}
          </div>

          {hasDiagnostics ? (
            <pre
              className="code-block"
              style={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                margin: 0,
                maxHeight: 260,
              }}
            >
              {logExcerpt || "Diagnostics unavailable."}
            </pre>
          ) : (
            <div className="alert alert-info">
              <span>ℹ️</span>
              <span>Diagnostics unavailable for this stage.</span>
            </div>
          )}

          {copied && (
            <div className="alert alert-success mt-3">
              <span>✅</span>
              <span>Diagnostics copied to clipboard.</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
