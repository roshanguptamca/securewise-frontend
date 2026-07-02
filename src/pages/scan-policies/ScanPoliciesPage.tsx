import { useEffect, useState } from "react";
import { sw } from "../../api/client";
import type { Organization, ScanPolicy } from "../../types";
import { SeverityBadge } from "../../components/ui/Badges";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../components/ui/States";
import { Modal } from "../../components/ui/Modal";

function parseApiError(error: any): string {
  const data = error?.response?.data;
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

export default function ScanPoliciesPage() {
  const [policies, setPolicies] = useState<ScanPolicy[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editPolicy, setEditPolicy] = useState<ScanPolicy | null>(null);
  const [deletePolicy, setDeletePolicy] = useState<ScanPolicy | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    Promise.all([sw.policies.list(), sw.orgs.list()])
      .then(([policyResponse, orgResponse]) => {
        setPolicies(policyResponse.data.results ?? policyResponse.data);
        setOrgs(orgResponse.data.results ?? orgResponse.data);
      })
      .catch(() => setError("Failed to load policies."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleSetDefault = async (policyId: string) => {
    setActionId(policyId);
    setActionMessage("");
    try {
      await sw.policies.setDefault(policyId);
      setActionMessage("Default policy updated.");
      load();
    } catch (actionError: any) {
      setActionMessage(parseApiError(actionError));
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async () => {
    if (!deletePolicy) return;
    setDeleting(true);
    setActionMessage("");
    try {
      await sw.policies.delete(deletePolicy.id);
      setActionMessage(`Policy "${deletePolicy.name}" deleted.`);
      setDeletePolicy(null);
      load();
    } catch (actionError: any) {
      setActionMessage(parseApiError(actionError));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <div className="sw-page-header">
        <div>
          <h1 className="sw-page-title">Scan Policies</h1>
          <p className="sw-page-subtitle">
            Define scan scope and quality gate thresholds.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          + New Policy
        </button>
      </div>

      {actionMessage && (
        <div className="alert alert-info mb-4" role="status">
          <span>ℹ️</span>
          <span>{actionMessage}</span>
        </div>
      )}

      {policies.length === 0 ? (
        <EmptyState
          title="No policies yet"
          description="Create a scan policy to define scan scope and quality gates."
          action={
            <button className="btn-primary" onClick={() => setShowCreate(true)}>
              Create Policy
            </button>
          }
        />
      ) : (
        <div className="glass-card" style={{ overflow: "hidden" }}>
          <table className="sw-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Scan Types</th>
                <th>Fail On</th>
                <th>Max Critical</th>
                <th>Max High</th>
                <th>Max Medium</th>
                <th>Active</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {policies.map((policy) => (
                <tr key={policy.id}>
                  <td
                    className="text-sm font-semibold"
                    style={{ color: "var(--gw-text-primary)" }}
                  >
                    <div
                      className="flex items-center gap-2"
                      style={{ flexWrap: "wrap" }}
                    >
                      <span>{policy.name}</span>
                      {policy.is_default && (
                        <span className="badge badge-info">Default</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="flex gap-1" style={{ flexWrap: "wrap" }}>
                      {policy.scan_types.map((type) => (
                        <span key={type} className="badge badge-info">
                          {type}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <SeverityBadge value={policy.fail_on_severity} />
                    {policy.fail_on_secrets && (
                      <div className="text-xs text-muted mt-1">
                        Secrets fail gate
                      </div>
                    )}
                  </td>
                  <td className="text-muted text-sm">{policy.max_critical}</td>
                  <td className="text-muted text-sm">{policy.max_high}</td>
                  <td className="text-muted text-sm">
                    {policy.max_medium === -1 ? "Unlimited" : policy.max_medium}
                  </td>
                  <td>
                    <span
                      className={`badge ${policy.is_active ? "badge-active" : "badge-cancelled"}`}
                    >
                      {policy.is_active ? "active" : "inactive"}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
                      {!policy.is_default && (
                        <button
                          className="btn-secondary"
                          onClick={() => handleSetDefault(policy.id)}
                          disabled={actionId === policy.id}
                          style={{
                            fontSize: "0.78rem",
                            padding: "0.45rem 0.7rem",
                          }}
                        >
                          {actionId === policy.id
                            ? "Saving…"
                            : "Set as default"}
                        </button>
                      )}
                      <button
                        className="btn-secondary"
                        onClick={() => setEditPolicy(policy)}
                        style={{
                          fontSize: "0.78rem",
                          padding: "0.45rem 0.7rem",
                        }}
                      >
                        ✎ Edit
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => setDeletePolicy(policy)}
                        style={{
                          fontSize: "0.78rem",
                          padding: "0.45rem 0.7rem",
                          color: "var(--gw-danger, #e5484d)",
                        }}
                      >
                        🗑 Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showCreate && (
        <CreatePolicyModal
          orgs={orgs}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
      {editPolicy && (
        <EditPolicyModal
          policy={editPolicy}
          onClose={() => setEditPolicy(null)}
          onSaved={() => {
            setEditPolicy(null);
            setActionMessage(`Policy "${editPolicy.name}" updated.`);
            load();
          }}
        />
      )}
      {deletePolicy && (
        <Modal
          title="Delete Scan Policy"
          onClose={() => setDeletePolicy(null)}
          footer={
            <>
              <button
                className="btn-secondary"
                onClick={() => setDeletePolicy(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleDelete}
                disabled={deleting}
                style={{ background: "var(--gw-danger, #e5484d)" }}
              >
                {deleting ? "Deleting…" : "Delete Policy"}
              </button>
            </>
          }
        >
          <p>
            Are you sure you want to delete <strong>{deletePolicy.name}</strong>
            ? Scans that already used this policy keep their recorded
            quality-gate result, but you won't be able to select this policy for
            new scans anymore. This cannot be undone.
          </p>
          {deletePolicy.is_default && (
            <p className="text-xs text-muted" style={{ marginTop: 8 }}>
              This is the default policy for its organization — new scans will
              run without a default policy until you set another one.
            </p>
          )}
        </Modal>
      )}
    </div>
  );
}

function PolicyFormFields({
  form,
  set,
  toggleType,
  orgs,
  lockOrganization,
}: {
  form: any;
  set: (key: string, value: any) => void;
  toggleType: (type: string) => void;
  orgs: Organization[];
  lockOrganization?: boolean;
}) {
  return (
    <div className="flex-col gap-4">
      <div className="form-group">
        <label className="form-label">Organization *</label>
        <select
          className="form-select"
          value={form.organization}
          onChange={(event) => set("organization", event.target.value)}
          disabled={lockOrganization}
        >
          {orgs.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
        {lockOrganization && (
          <p className="text-xs text-muted" style={{ marginTop: 4 }}>
            A policy cannot be moved to a different organization.
          </p>
        )}
      </div>
      <div className="form-group">
        <label className="form-label">Policy Name *</label>
        <input
          className="form-input"
          value={form.name}
          onChange={(event) => set("name", event.target.value)}
          placeholder="Default Security Policy"
        />
      </div>
      <div className="form-group">
        <label className="form-label">Scan Types</label>
        <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
          {[
            "sast",
            "dast",
            "sca",
            "secrets",
            "iac",
            "container",
            "api",
            "full",
          ].map((type) => (
            <button
              key={type}
              type="button"
              className={`badge ${form.scan_types.includes(type) ? "badge-completed" : "badge-pending"}`}
              style={{ cursor: "pointer", border: "none" }}
              onClick={() => toggleType(type)}
            >
              {type}
            </button>
          ))}
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Fail on Severity</label>
        <select
          className="form-select"
          value={form.fail_on_severity}
          onChange={(event) => set("fail_on_severity", event.target.value)}
        >
          {["critical", "high", "medium", "low"].map((severity) => (
            <option key={severity} value={severity}>
              {severity}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted" style={{ marginTop: 4 }}>
          Findings at or above this severity fail the gate.
        </p>
      </div>
      <div className="grid grid-3 gap-4">
        <div className="form-group">
          <label className="form-label">Max Critical</label>
          <input
            className="form-input"
            type="number"
            min="0"
            value={form.max_critical}
            onChange={(event) => set("max_critical", event.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Max High</label>
          <input
            className="form-input"
            type="number"
            min="0"
            value={form.max_high}
            onChange={(event) => set("max_high", event.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Max Medium</label>
          <input
            className="form-input"
            type="number"
            min="-1"
            value={form.max_medium}
            onChange={(event) => set("max_medium", event.target.value)}
          />
          <p className="text-xs text-muted" style={{ marginTop: 4 }}>
            Use -1 for unlimited medium findings.
          </p>
        </div>
      </div>

      {[
        {
          key: "fail_on_secrets",
          label: "Fail on secrets",
          help: "Any open secret finding fails the gate regardless of severity.",
        },
        {
          key: "fail_on_new_findings_only",
          label: "Fail on new findings only",
          help: "Ignore legacy findings when calculating the gate decision.",
        },
        {
          key: "allow_accepted_risks",
          label: "Allow accepted risks",
          help: "Accepted-risk findings do not count toward gate failure.",
        },
        {
          key: "allow_false_positives",
          label: "Allow false positives",
          help: "False-positive findings do not count toward gate failure.",
        },
      ].map((field) => (
        <div className="form-group" key={field.key}>
          <label
            className="flex items-center gap-2 text-sm"
            style={{ cursor: "pointer" }}
          >
            <input
              type="checkbox"
              checked={Boolean(form[field.key as keyof typeof form])}
              onChange={(event) => set(field.key, event.target.checked)}
            />
            <span style={{ color: "var(--gw-text-body)" }}>{field.label}</span>
          </label>
          <p className="text-xs text-muted" style={{ marginTop: 4 }}>
            {field.help}
          </p>
        </div>
      ))}
    </div>
  );
}

function CreatePolicyModal({
  orgs,
  onClose,
  onCreated,
}: {
  orgs: Organization[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    organization: orgs[0]?.id ?? "",
    project: "",
    name: "",
    scan_types: ["sast"],
    fail_on_severity: "high",
    max_critical: "0",
    max_high: "5",
    max_medium: "-1",
    fail_on_secrets: false,
    fail_on_new_findings_only: false,
    allow_accepted_risks: true,
    allow_false_positives: true,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const set = (key: string, value: any) => {
    setErr("");
    setForm((current) => ({ ...current, [key]: value }));
  };

  const toggleType = (type: string) =>
    set(
      "scan_types",
      form.scan_types.includes(type)
        ? form.scan_types.filter((value: string) => value !== type)
        : [...form.scan_types, type],
    );

  const submit = async () => {
    if (!form.name) {
      setErr("Name is required.");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      await sw.policies.create({
        ...form,
        max_critical: Number(form.max_critical),
        max_high: Number(form.max_high),
        max_medium: Number(form.max_medium),
        project: form.project || undefined,
      });
      onCreated();
    } catch (error: any) {
      setErr(parseApiError(error) || "Failed to create policy.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Create Scan Policy"
      onClose={onClose}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={submit} disabled={saving}>
            {saving ? "Creating…" : "Create"}
          </button>
        </>
      }
    >
      {err && <div className="alert alert-error mb-4">{err}</div>}
      <PolicyFormFields
        form={form}
        set={set}
        toggleType={toggleType}
        orgs={orgs}
      />
    </Modal>
  );
}

function EditPolicyModal({
  policy,
  onClose,
  onSaved,
}: {
  policy: ScanPolicy;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    organization: policy.organization,
    project: policy.project ?? "",
    name: policy.name,
    scan_types: [...policy.scan_types] as string[],
    fail_on_severity: policy.fail_on_severity,
    max_critical: String(policy.max_critical),
    max_high: String(policy.max_high),
    max_medium: String(policy.max_medium),
    fail_on_secrets: policy.fail_on_secrets,
    fail_on_new_findings_only: policy.fail_on_new_findings_only,
    allow_accepted_risks: policy.allow_accepted_risks,
    allow_false_positives: policy.allow_false_positives,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const set = (key: string, value: any) => {
    setErr("");
    setForm((current) => ({ ...current, [key]: value }));
  };

  const toggleType = (type: string) =>
    set(
      "scan_types",
      form.scan_types.includes(type)
        ? form.scan_types.filter((value: string) => value !== type)
        : [...form.scan_types, type],
    );

  const submit = async () => {
    if (!form.name) {
      setErr("Name is required.");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      await sw.policies.update(policy.id, {
        ...form,
        max_critical: Number(form.max_critical),
        max_high: Number(form.max_high),
        max_medium: Number(form.max_medium),
        project: form.project || undefined,
      });
      onSaved();
    } catch (error: any) {
      setErr(parseApiError(error) || "Failed to update policy.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`Edit Policy: ${policy.name}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </>
      }
    >
      {err && <div className="alert alert-error mb-4">{err}</div>}
      <PolicyFormFields
        form={form}
        set={set}
        toggleType={toggleType}
        orgs={[{ id: policy.organization, name: policy.organization } as any]}
        lockOrganization
      />
    </Modal>
  );
}
