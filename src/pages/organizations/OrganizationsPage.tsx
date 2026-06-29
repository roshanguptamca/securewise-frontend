import { useEffect, useState } from "react";
import { sw } from "../../api/client";
import type { Organization } from "../../types";
import {
  LoadingState,
  EmptyState,
  ErrorState,
} from "../../components/ui/States";
import { Modal } from "../../components/ui/Modal";

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const load = () => {
    setLoading(true);
    sw.orgs
      .list()
      .then((r) => setOrgs(r.data.results ?? r.data))
      .catch(() => setError("Failed to load organizations."))
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
          <h1 className="sw-page-title">Organizations</h1>
          <p className="sw-page-subtitle">
            Manage your security organizations and their members.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          + New Organization
        </button>
      </div>

      {orgs.length === 0 ? (
        <EmptyState
          title="No organizations yet"
          description="Create an organization to group your projects and team members."
          action={
            <button className="btn-primary" onClick={() => setShowCreate(true)}>
              Create Organization
            </button>
          }
        />
      ) : (
        <div className="grid grid-3 gap-4">
          {orgs.map((org) => (
            <div
              key={org.id}
              className="glass-card"
              style={{ padding: "1.25rem" }}
            >
              <div className="flex items-center gap-3 mb-3">
                {org.logo_url ? (
                  <img
                    src={org.logo_url}
                    alt=""
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: "linear-gradient(135deg,#6366f1,#a855f7)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      color: "#fff",
                      fontSize: "1.1rem",
                    }}
                  >
                    {org.name[0]}
                  </div>
                )}
                <div>
                  <div
                    className="text-sm font-bold"
                    style={{ color: "var(--gw-text-primary)" }}
                  >
                    {org.name}
                  </div>
                  <div className="text-xs text-subtle">{org.slug}</div>
                </div>
              </div>
              {org.description && (
                <p className="text-xs text-muted mb-3">{org.description}</p>
              )}
              <div className="flex justify-between text-xs">
                <span className="text-subtle">Members</span>
                <span style={{ color: "var(--gw-text-body)" }}>
                  {org.member_count}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateOrgModal
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

function CreateOrgModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    website: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: string, v: string) =>
    setForm((f) => ({
      ...f,
      [k]: v,
      ...(k === "name"
        ? {
            slug: v
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, ""),
          }
        : {}),
    }));

  const submit = async () => {
    if (!form.name) return setErr("Name is required.");
    setSaving(true);
    try {
      await sw.orgs.create(form);
      onCreated();
    } catch (e: any) {
      setErr(
        e.response?.data?.detail ??
          JSON.stringify(e.response?.data) ??
          "Failed.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Create Organization"
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
          <label className="form-label">Name *</label>
          <input
            className="form-input"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Acme Security"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Slug</label>
          <input
            className="form-input"
            value={form.slug}
            onChange={(e) => set("slug", e.target.value)}
            placeholder="acme-security"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea
            className="form-textarea"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Website</label>
          <input
            className="form-input"
            type="url"
            value={form.website}
            onChange={(e) => set("website", e.target.value)}
            placeholder="https://example.com"
          />
        </div>
      </div>
    </Modal>
  );
}
