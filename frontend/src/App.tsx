import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";

type Role = "requester" | "provider" | "verifier";

type HealthResponse = {
  status: string;
  service: string;
  network: string;
};

type JobResponse = {
  jobId: string;
  requester: string;
  provider: string;
  verifier: string;
  amount: string;
  taskHash: string;
  resultHash: string;
  workDeadline: string;
  verificationDeadline: string;
  verificationWindow: string;
  statusCode: number;
  status: string;
  contractAddress: string;
  explorerUrl: string;
};

const roleCopy: Record<Role, { label: string; note: string }> = {
  requester: {
    label: "Requester",
    note: "Fund work, monitor delivery and release payment.",
  },
  provider: {
    label: "Provider",
    note: "Complete the funded task and submit the result.",
  },
  verifier: {
    label: "Verifier",
    note: "Review submitted work and resolve the escrow.",
  },
};

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    let message = "Request failed with status " + response.status + ".";

    try {
      const body = (await response.json()) as { message?: unknown };
      if (typeof body.message === "string") {
        message = body.message;
      }
    } catch {
      // Keep the fallback message.
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
}

function shorten(value: string) {
  if (value.length <= 14) return value;
  return value.slice(0, 7) + "..." + value.slice(-5);
}

function formatDate(unixSeconds: string) {
  const value = Number(unixSeconds);
  if (!Number.isFinite(value) || value <= 0) return "Not started";
  return new Date(value * 1000).toLocaleString();
}

function App() {
  const [role, setRole] = useState<Role>("requester");
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [job, setJob] = useState<JobResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [healthData, jobData] = await Promise.all([
        fetchJson<HealthResponse>("/health"),
        fetchJson<JobResponse>("/api/jobs/5"),
      ]);

      setHealth(healthData);
      setJob(jobData);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Dashboard data could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const progress = useMemo(() => {
    if (!job) return 0;
    if (job.status === "RELEASED" || job.status === "REFUNDED") return 3;
    if (job.status === "SUBMITTED") return 2;
    if (job.status === "FUNDED") return 1;
    return 0;
  }, [job]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">V</div>
          <div>
            <strong>Veris</strong>
            <span>Verified work escrow</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="Primary navigation">
          <button className="nav-link active">Overview</button>
          <button className="nav-link">Jobs</button>
          <button className="nav-link">Transactions</button>
        </nav>

        <div className="network-card">
          <div className="network-title">
            <span className="status-dot" />
            Arc Testnet
          </div>
          <p>Circle developer-controlled wallets power escrow settlement.</p>
        </div>
      </aside>

      <main className="dashboard">
        <header className="page-header">
          <div>
            <p className="eyebrow">VERIS CONTROL CENTRE</p>
            <h1>Escrow dashboard</h1>
            <p className="subheading">
              Live visibility into verified work and onchain settlement.
            </p>
          </div>

          <button
            className="refresh-button"
            type="button"
            onClick={() => void loadDashboard()}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh data"}
          </button>
        </header>

        {error ? (
          <section className="error-banner">
            <div>
              <strong>Backend unavailable</strong>
              <p>{error}</p>
            </div>
            <button type="button" onClick={() => void loadDashboard()}>
              Retry
            </button>
          </section>
        ) : null}

        <section className="role-tabs" aria-label="Dashboard role">
          {(Object.keys(roleCopy) as Role[]).map((item) => (
            <button
              key={item}
              type="button"
              className={role === item ? "role-tab selected" : "role-tab"}
              onClick={() => setRole(item)}
            >
              <strong>{roleCopy[item].label}</strong>
              <span>{roleCopy[item].note}</span>
            </button>
          ))}
        </section>

        <section className="stats-grid">
          <article className="stat-card">
            <span>Active escrow</span>
            <strong>{job ? job.amount + " USDC" : "—"}</strong>
            <small>Secured in the Veris contract</small>
          </article>
          <article className="stat-card">
            <span>Active jobs</span>
            <strong>{job ? "1" : "—"}</strong>
            <small>Current testnet workload</small>
          </article>
          <article className="stat-card">
            <span>Network health</span>
            <strong>{health?.status === "ok" ? "Operational" : "Checking"}</strong>
            <small>{health?.network ?? "Arc Testnet"}</small>
          </article>
          <article className="stat-card">
            <span>Current role</span>
            <strong>{roleCopy[role].label}</strong>
            <small>Role-specific workspace</small>
          </article>
        </section>

        <section className="content-grid">
          <article className="panel job-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">ACTIVE JOB</p>
                <h2>Veris API Integration Test</h2>
              </div>
              <span className="status-badge">{job?.status ?? "Loading"}</span>
            </div>

            <div className="job-summary">
              <div><span>Job ID</span><strong>#{job?.jobId ?? "—"}</strong></div>
              <div><span>Escrow</span><strong>{job ? job.amount + " USDC" : "—"}</strong></div>
              <div><span>Work deadline</span><strong>{job ? formatDate(job.workDeadline) : "—"}</strong></div>
            </div>

            <div className="progress-row">
              {["Funded", "Submitted", "Released"].map((label, index) => (
                <div className={index < progress ? "step complete" : "step"} key={label}>
                  <div className="step-marker">{index < progress ? "✓" : index + 1}</div>
                  <span>{label}</span>
                </div>
              ))}
            </div>

            <div className="role-state">
              <div>
                <span>{roleCopy[role].label} workspace</span>
                <strong>
                  {role === "requester"
                    ? "Waiting for the provider to submit work"
                    : role === "provider"
                      ? "The escrow is funded and ready for delivery"
                      : "Verification begins after provider submission"}
                </strong>
              </div>
              <span className="role-pill">{job?.status ?? "Loading"}</span>
            </div>

            <div className="address-grid">
              <div><span>Requester</span><code>{job ? shorten(job.requester) : "—"}</code></div>
              <div><span>Provider</span><code>{job ? shorten(job.provider) : "—"}</code></div>
              <div><span>Verifier</span><code>{job ? shorten(job.verifier) : "—"}</code></div>
            </div>
          </article>

          <aside className="panel details-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">ONCHAIN DETAILS</p>
                <h2>Arc settlement</h2>
              </div>
            </div>

            <dl className="details-list">
              <div><dt>Contract</dt><dd>{job ? shorten(job.contractAddress) : "—"}</dd></div>
              <div><dt>Status code</dt><dd>{job?.statusCode ?? "—"}</dd></div>
              <div><dt>Verification window</dt><dd>{job ? job.verificationWindow + " sec" : "—"}</dd></div>
              <div><dt>Task hash</dt><dd>{job ? shorten(job.taskHash) : "—"}</dd></div>
            </dl>

            {job ? (
              <a className="explorer-link" href={job.explorerUrl} target="_blank" rel="noreferrer">
                View contract on Arcscan <span>↗</span>
              </a>
            ) : null}
          </aside>
        </section>
      </main>
    </div>
  );
}

export default App;
