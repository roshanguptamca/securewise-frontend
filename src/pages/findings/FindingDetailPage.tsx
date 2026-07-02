import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { sw } from "../../api/client";
import type { Finding } from "../../types";
import { SeverityBadge, FindingStatusBadge } from "../../components/ui/Badges";
import { LoadingState, ErrorState } from "../../components/ui/States";
import { Modal } from "../../components/ui/Modal";

export default function FindingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [finding, setFinding] = useState<Finding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [noteModal, setNoteModal] = useState<"accept" | "fp" | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!id) return;
    sw.findings
      .get(id)
      .then((r) => setFinding(r.data))
      .catch(() => setError("Failed to load finding."))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, [id]);

  const handleAction = async (type: "accept" | "fp") => {
    if (!id) return;
    setSaving(true);
    try {
      if (type === "accept") await sw.findings.acceptRisk(id, note);
      else await sw.findings.markFalsePositive(id, note);
      setNoteModal(null);
      setNote("");
      load();
    } catch {
      // noop
    } finally {
      setSaving(false);
    }
  };

  const handleMarkFixed = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await sw.findings.update(id, { status: "fixed" });
      load();
    } catch {
      // noop
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error || !finding)
    return <ErrorState message={error || "Finding not found."} />;

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
        {/* Main detail */}
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
                ❌ VULNERABLE CODE
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

          {/* AI Fix Suggestion */}
          <div
            className="glass-card"
            style={{
              padding: "1.25rem",
              borderColor: "rgba(99,102,241,0.25)",
              background: "rgba(99,102,241,0.06)",
            }}
          >
            <h2
              style={{
                fontSize: "0.85rem",
                fontWeight: 700,
                marginBottom: "0.75rem",
                color: "#a5b4fc",
              }}
            >
              🤖 AI FIX SUGGESTION
            </h2>
            {finding.ai_fix_suggestion ? (
              <p
                className="text-sm"
                style={{ color: "var(--gw-text-body)", lineHeight: 1.7 }}
              >
                {finding.ai_fix_suggestion}
              </p>
            ) : (
              <p className="text-sm text-muted">
                AI-powered fix recommendations coming soon. The system will
                analyze this finding and suggest context-aware remediation
                steps.
                {/* TODO: Integrate LLM (e.g., Gemini / OpenAI) to generate fix suggestions */}
              </p>
            )}
          </div>
        </div>

        {/* Side metadata */}
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

      {/* Accept risk / false positive modal */}
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
                onClick={() => handleAction(noteModal!)}
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
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reason for this decision…"
            />
          </div>
        </Modal>
      )}
    </div>
  );
}

import React from "react";
