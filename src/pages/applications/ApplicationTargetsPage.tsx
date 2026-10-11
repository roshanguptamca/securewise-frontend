import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { sw } from "../../api/client";
import type {
  Organization,
  Project,
  SecureWiseApplicationTarget,
  SecureWiseOwnershipChallenge,
  SecureWiseTestingAuthorization,
} from "../../types";

type ScanLink = { id: string; status: string };

function errorMessage(error: unknown, fallback: string): string {
  const detail = (error as { response?: { data?: { detail?: unknown } } })
    .response?.data?.detail;
  return typeof detail === "string" ? detail : fallback;
}

export default function ApplicationTargetsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [targets, setTargets] = useState<SecureWiseApplicationTarget[]>([]);
  const [authorizations, setAuthorizations] = useState<
    SecureWiseTestingAuthorization[]
  >([]);
  const [project, setProject] = useState("");
  const [url, setUrl] = useState("");
  const [verificationMethod, setVerificationMethod] = useState<
    "dns_txt" | "https_well_known"
  >("dns_txt");
  const [challenge, setChallenge] =
    useState<SecureWiseOwnershipChallenge | null>(null);
  const [challengeTargetId, setChallengeTargetId] = useState("");
  const [scopeTarget, setScopeTarget] =
    useState<SecureWiseApplicationTarget | null>(null);
  const [scopePaths, setScopePaths] = useState("/");
  const [excludedPaths, setExcludedPaths] = useState("");
  const [environment, setEnvironment] = useState<"staging" | "test">("staging");
  const [explicitAuthorization, setExplicitAuthorization] = useState(false);
  const [scan, setScan] = useState<ScanLink | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [
      orgResponse,
      projectResponse,
      targetResponse,
      authorizationResponse,
    ] = await Promise.all([
      sw.orgs.list(),
      sw.projects.list(),
      sw.applicationTargets.list(),
      sw.testingAuthorizations.list(),
    ]);
    setOrganizations(orgResponse.data.results ?? orgResponse.data);
    setProjects(projectResponse.data.results ?? projectResponse.data);
    setTargets(targetResponse.data);
    setAuthorizations(authorizationResponse.data);
  }, []);

  useEffect(() => {
    load().catch((reason: unknown) =>
      setError(
        errorMessage(reason, "Application target data could not be loaded."),
      ),
    );
  }, [load]);

  const registerTarget = async () => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await sw.applicationTargets.register({
        project,
        url,
        verification_method: verificationMethod,
      });
      setChallenge(response.data.challenge);
      setChallengeTargetId(response.data.target.id);
      setUrl("");
      setNotice(
        "Target registered. Complete the ownership challenge, then verify it.",
      );
      await load();
    } catch (reason) {
      setError(errorMessage(reason, "Target registration failed."));
    } finally {
      setBusy(false);
    }
  };

  const createChallenge = async (target: SecureWiseApplicationTarget) => {
    setBusy(true);
    setError("");
    try {
      const response = await sw.applicationTargets.action(
        target.id,
        "challenge",
        {
          verification_method: verificationMethod,
        },
      );
      setChallenge(response.data);
      setChallengeTargetId(target.id);
      setNotice("Publish the challenge proof before verifying ownership.");
    } catch (reason) {
      setError(
        errorMessage(reason, "Could not create an ownership challenge."),
      );
    } finally {
      setBusy(false);
    }
  };

  const verifyChallenge = async (targetId: string) => {
    if (!challenge) return;
    setBusy(true);
    setError("");
    try {
      await sw.applicationTargets.action(targetId, "verify", {
        challenge: challenge.id,
      });
      setChallenge(null);
      setChallengeTargetId("");
      setNotice(
        "Ownership verified. This does not authorize security testing.",
      );
      await load();
    } catch (reason) {
      setError(errorMessage(reason, "Ownership verification failed."));
    } finally {
      setBusy(false);
    }
  };

  const approveScope = async () => {
    if (!scopeTarget) return;
    setBusy(true);
    setError("");
    try {
      await sw.applicationTargets.action(scopeTarget.id, "authorize", {
        explicit_authorization: explicitAuthorization,
        testing_environment: environment,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        allowed_paths: scopePaths
          .split("\n")
          .map((path) => path.trim())
          .filter(Boolean),
        excluded_paths: excludedPaths
          .split("\n")
          .map((path) => path.trim())
          .filter(Boolean),
      });
      setScopeTarget(null);
      setExplicitAuthorization(false);
      setNotice("Passive testing scope approved for 24 hours.");
      await load();
    } catch (reason) {
      setError(errorMessage(reason, "Testing scope could not be approved."));
    } finally {
      setBusy(false);
    }
  };

  const startAssessment = async (
    target: SecureWiseApplicationTarget,
    authorization: SecureWiseTestingAuthorization,
  ) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const created = await sw.scans.create({
        project: target.project,
        scan_type: "dast",
        target_url: target.url,
        testing_authorization: authorization.id,
      });
      const started = await sw.scans.start(created.data.id);
      setScan({ id: created.data.id, status: started.data.status });
      setNotice(
        "Passive assessment queued. Worker readiness and progress are shown in scan details.",
      );
    } catch (reason) {
      setError(
        errorMessage(
          reason,
          "Assessment was not started. Check authorization and protected worker readiness.",
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  const revokeOwnership = async (target: SecureWiseApplicationTarget) => {
    setBusy(true);
    setError("");
    try {
      await sw.applicationTargets.action(target.id, "revoke-ownership");
      await load();
      setNotice("Ownership and active testing authorizations revoked.");
    } catch (reason) {
      setError(errorMessage(reason, "Ownership revocation failed."));
    } finally {
      setBusy(false);
    }
  };

  const revokeAuthorization = async (id: string) => {
    setBusy(true);
    setError("");
    try {
      await sw.testingAuthorizations.revoke(id);
      await load();
    } catch (reason) {
      setError(errorMessage(reason, "Authorization revocation failed."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sw-page">
      <div className="sw-page-header">
        <div>
          <h1 className="sw-page-title">Application Targets</h1>
          <p className="text-sm text-muted">
            Verify exact-host ownership separately from approval to test.
          </p>
        </div>
        <Link className="btn-secondary" to="/repositories">
          Connect GitHub repository
        </Link>
      </div>

      <div className="alert alert-warning mb-4">
        External URL scans are blocked unless the worker advertises restricted
        egress and the deployment has independently enforced its network policy.
        The first URL workflow performs one scoped passive HTTPS request only;
        active tests and external ZAP spidering are unavailable.
      </div>
      {error && <div className="alert alert-error mb-3">{error}</div>}
      {notice && <div className="alert alert-success mb-3">{notice}</div>}

      <section className="glass-card mb-4" style={{ padding: "1.25rem" }}>
        <h2 className="text-sm font-semibold mb-3">
          Register an HTTPS website
        </h2>
        <div className="flex gap-2 items-end">
          <label className="form-group" style={{ flex: 1 }}>
            <span className="form-label">Project</span>
            <select
              className="form-select"
              value={project}
              onChange={(event) => setProject(event.target.value)}
            >
              <option value="">Select project</option>
              {projects.map((item) => (
                <option key={item.id} value={item.id}>
                  {
                    organizations.find((org) => org.id === item.organization)
                      ?.name
                  }{" "}
                  / {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="form-group" style={{ flex: 2 }}>
            <span className="form-label">Exact HTTPS URL</span>
            <input
              className="form-input"
              type="url"
              placeholder="https://app.example.com/"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
          </label>
          <label className="form-group">
            <span className="form-label">Ownership proof</span>
            <select
              className="form-select"
              value={verificationMethod}
              onChange={(event) =>
                setVerificationMethod(
                  event.target.value as "dns_txt" | "https_well_known",
                )
              }
            >
              <option value="dns_txt">DNS TXT</option>
              <option value="https_well_known">HTTPS well-known</option>
            </select>
          </label>
          <button
            className="btn-primary"
            disabled={busy || !project || !url}
            onClick={registerTarget}
          >
            Register
          </button>
        </div>
      </section>

      {challenge && (
        <section className="glass-card mb-4" style={{ padding: "1.25rem" }}>
          <h2 className="text-sm font-semibold mb-2">Ownership proof</h2>
          {challenge.method === "dns_txt" ? (
            <p className="text-sm">
              Publish a TXT record at <code>{challenge.dns_name}</code> with
              value <code>{challenge.token}</code>.
            </p>
          ) : (
            <p className="text-sm">
              Serve the challenge value <code>{challenge.token}</code> at{" "}
              <code>{challenge.https_path}</code> over HTTPS without redirects.
            </p>
          )}
          <p className="text-xs text-muted mt-2">
            Expires {new Date(challenge.expires_at).toLocaleString()}. This
            proof grants no permission to test.
          </p>
          {targets
            .filter((target) => target.id === challengeTargetId)
            .map((target) => (
              <button
                key={target.id}
                className="btn-secondary mt-3 mr-2"
                disabled={busy}
                onClick={() => verifyChallenge(target.id)}
              >
                Verify {target.hostname}
              </button>
            ))}
        </section>
      )}

      <section className="glass-card" style={{ padding: "1.25rem" }}>
        <h2 className="text-sm font-semibold mb-3">Registered targets</h2>
        {targets.length === 0 ? (
          <p className="text-sm text-muted">
            No application targets registered.
          </p>
        ) : (
          <div className="flex-col gap-3">
            {targets.map((target) => {
              const activeAuthorization = authorizations.find(
                (item) => item.target === target.id && item.active,
              );
              return (
                <article
                  key={target.id}
                  className="glass-card"
                  style={{ padding: "1rem" }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <strong>{target.url}</strong>
                      <p className="text-xs text-muted">
                        {target.verified
                          ? "Ownership verified"
                          : "Ownership unverified"}{" "}
                        ·{" "}
                        {
                          projects.find((item) => item.id === target.project)
                            ?.name
                        }
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {!target.verified ? (
                        <button
                          className="btn-secondary"
                          disabled={busy}
                          onClick={() => createChallenge(target)}
                        >
                          Create verification challenge
                        </button>
                      ) : (
                        <button
                          className="btn-secondary"
                          disabled={busy}
                          onClick={() => revokeOwnership(target)}
                        >
                          Revoke ownership
                        </button>
                      )}
                      {target.verified && !activeAuthorization && (
                        <button
                          className="btn-primary"
                          disabled={busy}
                          onClick={() => {
                            setScopeTarget(target);
                            setScopePaths(target.base_path || "/");
                          }}
                        >
                          Review test scope
                        </button>
                      )}
                    </div>
                  </div>

                  {scopeTarget?.id === target.id && (
                    <div className="mt-4">
                      <p className="text-sm font-semibold">
                        Passive-only scope · expires in 24 hours · HTTPS port{" "}
                        {target.port}
                      </p>
                      <label className="form-group mt-2">
                        <span className="form-label">
                          Allowed path prefixes, one per line
                        </span>
                        <textarea
                          className="form-input"
                          value={scopePaths}
                          onChange={(event) =>
                            setScopePaths(event.target.value)
                          }
                        />
                      </label>
                      <label className="form-group mt-2">
                        <span className="form-label">
                          Excluded paths, one per line
                        </span>
                        <textarea
                          className="form-input"
                          value={excludedPaths}
                          onChange={(event) =>
                            setExcludedPaths(event.target.value)
                          }
                        />
                      </label>
                      <label className="form-group mt-2">
                        <span className="form-label">Environment</span>
                        <select
                          className="form-select"
                          value={environment}
                          onChange={(event) =>
                            setEnvironment(
                              event.target.value as "staging" | "test",
                            )
                          }
                        >
                          <option value="staging">Staging</option>
                          <option value="test">Test</option>
                        </select>
                      </label>
                      <label className="flex items-center gap-2 text-sm mt-2">
                        <input
                          type="checkbox"
                          checked={explicitAuthorization}
                          onChange={(event) =>
                            setExplicitAuthorization(event.target.checked)
                          }
                        />
                        I am authorized to approve passive security testing of
                        this exact hostname and listed paths.
                      </label>
                      <div className="flex gap-2 mt-3">
                        <button
                          className="btn-primary"
                          disabled={busy || !explicitAuthorization}
                          onClick={approveScope}
                        >
                          Approve passive scope
                        </button>
                        <button
                          className="btn-secondary"
                          onClick={() => setScopeTarget(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {activeAuthorization && (
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-xs text-muted">
                        Authorized paths:{" "}
                        {activeAuthorization.allowed_paths.join(", ")} ·
                        Excluded:{" "}
                        {activeAuthorization.excluded_paths.join(", ") ||
                          "none"}{" "}
                        · expires{" "}
                        {new Date(
                          activeAuthorization.expires_at,
                        ).toLocaleString()}
                      </p>
                      <div className="flex gap-2">
                        <button
                          className="btn-primary"
                          disabled={busy}
                          onClick={() =>
                            startAssessment(target, activeAuthorization)
                          }
                        >
                          Start passive assessment
                        </button>
                        <button
                          className="btn-secondary"
                          disabled={busy}
                          onClick={() =>
                            revokeAuthorization(activeAuthorization.id)
                          }
                        >
                          Revoke scope
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {scan && (
        <p className="text-sm mt-4">
          Scan status: {scan.status}.{" "}
          <Link to={`/scans/${scan.id}`}>
            View progress, diagnostics and findings
          </Link>
        </p>
      )}
    </div>
  );
}
