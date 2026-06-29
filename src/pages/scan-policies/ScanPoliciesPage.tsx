import { useEffect, useState } from "react";
import { sw } from "../../api/client";
import type { ScanPolicy, Organization } from "../../types";
import { SeverityBadge } from "../../components/ui/Badges";
import {
  LoadingState,
  EmptyState,
  ErrorState,
} from "../../components/ui/States";
import { Modal } from "../../components/ui/Modal";

export default function ScanPoliciesPage() {
  const [policies, setPolicies] = useState<ScanPolicy[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([sw.policies.list(), sw.orgs.list()])
      .then(([p, o]) => {
        setPolicies(p.data.results ?? p.data);
        setOrgs(o.data.results ?? o.data);
      })
      .catch(() => setError("Failed to load policies."))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);

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
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((p) => (
                <tr key={p.id}>
                  <td
                    className="text-sm font-semibold"
                    style={{ color: "var(--gw-text-primary)" }}
                  >
                    {p.name}
                  </td>
                  <td>
                    <div className="flex gap-1" style={{ flexWrap: "wrap" }}>
                      {p.scan_types.map((t) => (
                        <span key={t} className="badge badge-info">
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <SeverityBadge value={p.fail_on_severity} />
                  </td>
                  <td className="text-muted text-sm">{p.max_critical}</td>
                  <td className="text-muted text-sm">{p.max_high}</td>
                  <td>
                    <span
                      className={`badge ${p.is_active ? "badge-active" : "badge-cancelled"}`}
                    >
                      {p.is_active ? "active" : "inactive"}
                    </span>
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
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const toggleType = (t: string) =>
    set(
      "scan_types",
      form.scan_types.includes(t)
        ? form.scan_types.filter((x: string) => x !== t)
        : [...form.scan_types, t],
    );

  const submit = async () => {
    if (!form.name) return setErr("Name is required.");
    setSaving(true);
    try {
      await sw.policies.create({
        ...form,
        max_critical: Number(form.max_critical),
        max_high: Number(form.max_high),
        project: form.project || undefined,
      });
      onCreated();
    } catch (e: any) {
      setErr(e.response?.data?.detail ?? "Failed.");
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
      <div className="flex-col gap-4">
        <div className="form-group">
          <label className="form-label">Organization *</label>
          <select
            className="form-select"
            value={form.organization}
            onChange={(e) => set("organization", e.target.value)}
          >
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Policy Name *</label>
          <input
            className="form-input"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
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
            ].map((t) => (
              <button
                key={t}
                type="button"
                className={`badge ${form.scan_types.includes(t) ? "badge-completed" : "badge-pending"}`}
                style={{ cursor: "pointer", border: "none" }}
                onClick={() => toggleType(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Fail on Severity</label>
          <select
            className="form-select"
            value={form.fail_on_severity}
            onChange={(e) => set("fail_on_severity", e.target.value)}
          >
            {["critical", "high", "medium", "low"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-2 gap-4">
          <div className="form-group">
            <label className="form-label">Max Critical</label>
            <input
              className="form-input"
              type="number"
              min="0"
              value={form.max_critical}
              onChange={(e) => set("max_critical", e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Max High</label>
            <input
              className="form-input"
              type="number"
              min="0"
              value={form.max_high}
              onChange={(e) => set("max_high", e.target.value)}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
