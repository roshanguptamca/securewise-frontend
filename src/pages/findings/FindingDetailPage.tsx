import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { sw } from "../../api/client";
import type { Finding, FindingAiSuggestionResponse } from "../../types";
import { SeverityBadge, FindingStatusBadge } from "../../components/ui/Badges";
import { LoadingState, ErrorState } from "../../components/ui/States";
import { Modal } from "../../components/ui/Modal";

function parseApiError(error: any): string {
  const data = error?.response?.data;
  if (error?.response?.status === 429) {
    return "You've hit the AI suggestion rate limit, try again later.";
  }
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    for (const value of Object.values(data)) {
      if (typeof value === "string") return value;
      if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    }
  }
  return "Request failed.";
}

function confidenceBadgeStyle(confidence: "low" | "medium" | "high") {
  if (confidence === "high") {
    return {
      background: "rgba(34, 197, 94, 0.18)",
      color: "#86efac",
      border: "1px solid rgba(34, 197, 94, 0.28)",
    };
  }
  if (confidence === "medium") {
    return {
      background: "rgba(250, 204, 21, 0.18)",
      color: "#fde68a",
      border: "1px solid rgba(250, 204, 21, 0.28)",
    };
  }
  return {
    background: "rgba(248, 113, 113, 0.18)",
    color: "#fca5a5",
    border: "1px solid rgba(248, 113, 113, 0.28)",
  };
}

export default function FindingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [finding, setFinding] = useState<Finding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [noteModal, setNoteModal] = useState<"accept" | "fp" | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiSuggestion, setAiSuggestion] =
    useState<FindingAiSuggestionResponse | null>(null);

  const load = () => {
    if (!id) return;
    setError("");
    sw.findings
      .get(id)
      .then((response) => setFinding(response.data))
      .catch(() => setError("Failed to load finding."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleAction = async (type: "accept" | "fp") => {
    if (!id) return;
    setSaving(true);
    setActionMessage("");
    try {
      if (type === "accept") {
        await sw.findings.acceptRisk(id, note);
        setActionMessage("Risk accepted.");
      } else {
        await sw.findings.markFalsePositive(id, note);
        setActionMessage("Finding marked as false positive.");
      }
      setNoteModal(null);
      setNote("");
      load();
    } catch (actionError: any) {
      setActionMessage(parseApiError(actionError));
    } finally {
      setSaving(false);
    }
  };

  const handleMarkFixed = async () => {
    if (!id) return;
    setSaving(true);
    setActionMessage("");
    try {
      await sw.findings.update(id, { status: "fixed" });
      setActionMessage("Finding marked as fixed.");
      load();
    } catch (actionError: any) {
      setActionMessage(parseApiError(actionError));
    } finally {
      setSaving(false);
    }
  };

  const handleFetchAiSuggestion = async (force = false) => {
    if (!id) return;
    setAiLoading(true);
    setAiError("");
    try {
      const response = await sw.findings.aiSuggestion(id, force);
      setAiSuggestion(response.data);
    } catch (suggestionError: any) {
      setAiError(parseApiError(suggestionError));
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error || !finding) {
    return <ErrorState message={error || "Finding not found."} />;
  }

  const snippet = finding.code_snippet?.trim();
  const suggestion = aiSuggestion?.ai_fix_suggestion;

  return (
    <div>
      <div className="breadcrumb">
        <Link to="/findings">Findings</Link>
        <span className="sep">/</span>
        <span className="current">
          {finding.title.slice(0, 40)}
          {finding.title.length > 40 ? "…" : ""}
        </span>
      </div>

      <button className="btn-secondary mb-4" onClick={() => navigate(-1)}>
        ← Back
      </button>

      {actionMessage && (
        <div className="alert alert-info mb-4" role="status">
          <span>ℹ️</span>
          <span>{actionMessage}</span>
        </div>
      )}

      <div className="sw-page-header">
        <div>
          <div
            className="flex items-center gap-3 mb-1"
            style={{ flexWrap: "wrap" }}
          >
            <SeverityBadge value={finding.severity} />
            <FindingStatusBadge value={finding.status} />
            {finding.cwe_id && (
              <span className="section-label">{finding.cwe_id}</span>
            )}
            {finding.owasp_category && (
              <span className="section-label">{finding.owasp_category}</span>
            )}
          </div>
          <h1
            className="sw-page-title"
            style={{ fontSize: "1.2rem", marginTop: 8 }}
          >
            {finding.title}
          </h1>
        </div>
        {finding.status === "open" && (
          <div className="flex gap-3" style={{ flexWrap: "wrap" }}>
            <button
              className="btn-secondary"
              onClick={handleMarkFixed}
              disabled={saving}
            >
              ✔ Mark Fixed
            </button>
            <button
              className="btn-secondary"
              onClick={() => setNoteModal("accept")}
            >
              Accept Risk
            </button>
            <button
              className="btn-secondary"
              onClick={() => setNoteModal("fp")}
            >
              Mark False Positive
            </button>
            <button className="btn-secondary" disabled title="Coming soon">
              🎫 Create Ticket
            </button>
            <button className="btn-secondary" disabled title="Coming soon">
              🔀 Create PR
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 300px" }}>
        <div className="flex-col gap-4">
          {finding.description && (
            <div className="glass-card" style={{ padding: "1.25rem" }}>
              <h2
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  marginBottom: "0.75rem",
                  color: "var(--gw-text-muted)",
                }}
              >
                DESCRIPTION
              </h2>
              <p
                className="text-sm"
                style={{ color: "var(--gw-text-body)", lineHeight: 1.7 }}
              >
                {finding.description}
              </p>
            </div>
          )}

          {(finding.file_path || finding.line_number) && (
            <div className="glass-card" style={{ padding: "1.25rem" }}>
              <h2
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  marginBottom: "0.75rem",
                  color: "var(--gw-text-muted)",
                }}
              >
                LOCATION
              </h2>
              <code className="text-sm" style={{ color: "#86efac" }}>
                {finding.file_path}
                {finding.line_number ? `:${finding.line_number}` : ""}
              </code>
              {finding.endpoint && (
                <div className="text-sm text-muted mt-2">
                  Endpoint:{" "}
                  <code style={{ color: "#67e8f9" }}>{finding.endpoint}</code>
                </div>
              )}
            </div>
          )}

          {snippet && (
            <div className="glass-card" style={{ padding: "1.25rem" }}>
              <h2
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  marginBottom: "0.75rem",
                  color: "var(--gw-text-muted)",
                }}
              >
                VULNERABLE CODE
              </h2>
              <pre
                style={{
                  margin: 0,
                  padding: "1rem",
                  borderRadius: 12,
                  background: "#0f172a",
                  color: "#e2e8f0",
                  overflowX: "auto",
                  fontFamily:
                    'ui-monospace, SFMono-Regular, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                  fontSize: "0.78rem",
                  lineHeight: 1.6,
                  whiteSpace: "pre",
                }}
              >
                {snippet}
              </pre>
            </div>
          )}

          {(finding.risk || finding.impact) && (
            <div className="glass-card" style={{ padding: "1.25rem" }}>
              <h2
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  marginBottom: "0.75rem",
                  color: "var(--gw-text-muted)",
                }}
              >
                RISK & IMPACT
              </h2>
              {finding.risk && (
                <p
                  className="text-sm mb-3"
                  style={{ color: "var(--gw-text-body)" }}
                >
                  <strong>Risk: </strong>
                  {finding.risk}
                </p>
              )}
              {finding.impact && (
                <p className="text-sm" style={{ color: "var(--gw-text-body)" }}>
                  <strong>Impact: </strong>
                  {finding.impact}
                </p>
              )}
            </div>
          )}

          {finding.evidence && Object.keys(finding.evidence).length > 0 && (
            <div className="glass-card" style={{ padding: "1.25rem" }}>
              <h2
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  marginBottom: "0.75rem",
                  color: "var(--gw-text-muted)",
                }}
              >
                EVIDENCE
              </h2>
              <pre className="code-block">
                {JSON.stringify(finding.evidence, null, 2)}
              </pre>
            </div>
          )}

          {finding.recommendation && (
            <div
              className="glass-card"
              style={{
                padding: "1.25rem",
                borderColor: "rgba(34,197,94,0.25)",
              }}
            >
              <h2
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  marginBottom: "0.75rem",
                  color: "#86efac",
                }}
              >
                🛠 RECOMMENDATION
              </h2>
              <p
                className="text-sm"
                style={{ color: "var(--gw-text-body)", lineHeight: 1.7 }}
              >
                {finding.recommendation}
              </p>
            </div>
          )}

          <div
            className="glass-card"
            style={{
              padding: "1.25rem",
              borderColor: "rgba(167,139,250,0.28)",
              background: "rgba(91,33,182,0.08)",
            }}
          >
            <div
              className="flex items-center justify-between gap-3"
              style={{ flexWrap: "wrap" }}
            >
              <h2
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  marginBottom: 0,
                  color: "#c4b5fd",
                }}
              >
                ✨ AI REMEDIATION
              </h2>
              {aiSuggestion && (
                <button
                  className="text-sm"
                  onClick={() => handleFetchAiSuggestion(true)}
                  disabled={aiLoading}
                  style={{
                    color: "#ddd6fe",
                    background: "transparent",
                    border: "none",
                    cursor: aiLoading ? "default" : "pointer",
                    padding: 0,
                  }}
                >
                  🔄 Regenerate
                </button>
              )}
            </div>
            <p
              className="text-sm text-muted"
              style={{ marginTop: 12, marginBottom: 12 }}
            >
              Generate an AI-assisted fix suggestion for this finding. Verify
              before applying.
            </p>
            <button
              className="btn-secondary"
              onClick={() => handleFetchAiSuggestion(false)}
              disabled={aiLoading}
            >
              {aiLoading ? "Generating…" : "✨ Get AI Fix Suggestion"}
            </button>

            {aiError && (
              <div className="alert alert-error mt-4">
                <span>⚠️</span>
                <span>{aiError}</span>
              </div>
            )}

            {aiLoading && (
              <div className="text-sm text-muted mt-3" role="status">
                Generating suggestion…
              </div>
            )}

            {aiSuggestion?.engine_unavailable && !suggestion && (
              <div className="alert alert-info mt-4">
                <span>ℹ️</span>
                <span>
                  AI recommendations are not configured in this environment.
                </span>
              </div>
            )}

            {suggestion && (
              <div
                className="glass-card mt-4"
                style={{
                  padding: "1.25rem",
                  background: "rgba(15, 23, 42, 0.55)",
                  borderColor: "rgba(167, 139, 250, 0.32)",
                }}
              >
                <div
                  className="flex items-center justify-between gap-3"
                  style={{ flexWrap: "wrap" }}
                >
                  <h3
                    style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0 }}
                  >
                    AI-Generated Suggestion (verify before applying)
                  </h3>
                  <span
                    className="badge"
                    style={confidenceBadgeStyle(suggestion.confidence)}
                  >
                    {suggestion.confidence} confidence
                  </span>
                </div>
                {aiSuggestion.cached && (
                  <p className="text-xs text-muted" style={{ marginTop: 8 }}>
                    Showing cached result.
                  </p>
                )}
                <div className="flex-col gap-4" style={{ marginTop: 16 }}>
                  {suggestion.explanation && (
                    <div>
                      <h4
                        className="text-xs text-subtle"
                        style={{ marginBottom: 6 }}
                      >
                        Explanation
                      </h4>
                      <p className="text-sm" style={{ lineHeight: 1.7 }}>
                        {suggestion.explanation}
                      </p>
                    </div>
                  )}
                  {suggestion.why_dangerous && (
                    <div>
                      <h4
                        className="text-xs text-subtle"
                        style={{ marginBottom: 6 }}
                      >
                        Why dangerous
                      </h4>
                      <p className="text-sm" style={{ lineHeight: 1.7 }}>
                        {suggestion.why_dangerous}
                      </p>
                    </div>
                  )}
                  {suggestion.fixed_code_example && (
                    <div>
                      <h4
                        className="text-xs text-subtle"
                        style={{ marginBottom: 6 }}
                      >
                        Fixed code example
                      </h4>
                      <pre className="code-block">
                        {suggestion.fixed_code_example}
                      </pre>
                    </div>
                  )}
                  {suggestion.framework_guidance && (
                    <div>
                      <h4
                        className="text-xs text-subtle"
                        style={{ marginBottom: 6 }}
                      >
                        Framework guidance
                      </h4>
                      <p className="text-sm" style={{ lineHeight: 1.7 }}>
                        {suggestion.framework_guidance}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {aiSuggestion &&
              !suggestion &&
              !aiSuggestion.engine_unavailable &&
              aiSuggestion.detail && (
                <p className="text-sm text-muted mt-4">{aiSuggestion.detail}</p>
              )}
          </div>

          {finding.bad_code_example && (
            <div className="glass-card" style={{ padding: "1.25rem" }}>
              <h2
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  marginBottom: "0.75rem",
                  color: "#fca5a5",
                }}
              >
                ❌ VULNERABLE CODE EXAMPLE
              </h2>
              <pre className="code-block">{finding.bad_code_example}</pre>
            </div>
          )}

          {finding.fixed_code_example && (
            <div className="glass-card" style={{ padding: "1.25rem" }}>
              <h2
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  marginBottom: "0.75rem",
                  color: "#86efac",
                }}
              >
                ✅ FIXED CODE
              </h2>
              <pre className="code-block">{finding.fixed_code_example}</pre>
            </div>
          )}
        </div>

        <div className="flex-col gap-4">
          <div className="glass-card" style={{ padding: "1.25rem" }}>
            <h2
              style={{
                fontSize: "0.85rem",
                fontWeight: 700,
                marginBottom: "0.75rem",
              }}
            >
              Details
            </h2>
            <div className="flex-col gap-3">
              {[
                ["Severity", <SeverityBadge value={finding.severity} />],
                [
                  "Confidence",
                  <span className="badge badge-info">
                    {finding.confidence.replace("_", " ")}
                  </span>,
                ],
                [
                  "Scanner",
                  <span className="badge badge-info">
                    {finding.scanner_type || "—"}
                  </span>,
                ],
                ["CWE", finding.cwe_id || "—"],
                ["OWASP", finding.owasp_category || "—"],
                ["Status", <FindingStatusBadge value={finding.status} />],
                ["Found", new Date(finding.created_at).toLocaleString()],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="flex items-center justify-between"
                >
                  <span className="text-xs text-subtle">{label}</span>
                  <span className="text-xs font-semibold">
                    {value as React.ReactNode}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {finding.reviewed_by_detail && (
            <div className="glass-card" style={{ padding: "1.25rem" }}>
              <h2
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  marginBottom: "0.75rem",
                }}
              >
                Review
              </h2>
              <p className="text-xs text-muted">
                By: {finding.reviewed_by_detail.username}
              </p>
              {finding.reviewed_at && (
                <p className="text-xs text-muted">
                  At: {new Date(finding.reviewed_at).toLocaleString()}
                </p>
              )}
              {finding.review_note && (
                <p
                  className="text-sm mt-2"
                  style={{ color: "var(--gw-text-body)" }}
                >
                  {finding.review_note}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {noteModal && (
        <Modal
          title={
            noteModal === "accept" ? "Accept Risk" : "Mark as False Positive"
          }
          onClose={() => setNoteModal(null)}
          footer={
            <>
              <button
                className="btn-secondary"
                onClick={() => setNoteModal(null)}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={() => handleAction(noteModal)}
                disabled={saving}
              >
                {saving ? "Saving…" : "Confirm"}
              </button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Note (optional)</label>
            <textarea
              className="form-textarea"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Reason for this decision…"
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
