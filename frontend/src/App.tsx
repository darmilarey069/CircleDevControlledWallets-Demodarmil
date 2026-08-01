import {
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
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

type CreateJobResponse = {
  internalJobId: string;
  transactionId: string;
  state: string;
  taskHash: string;
};

type CircleTransaction = {
  state?: string;
  txHash?: string;
};

type ReconciliationResponse = {
  reconciled: boolean;
  onchainJobId?: string;
  state?: string;
  chainStatus?: string;
  explorerUrl?: string;
};

type CreateJobForm = {
  title: string;
  taskDescription: string;
  providerAddress: string;
  verifierAddress: string;
  amount: string;
  workWindowSeconds: string;
  verificationWindowSeconds: string;
};

const defaultForm: CreateJobForm = {
  title: "",
  taskDescription: "",
  providerAddress:
    "0xdd24FDb60ea373b032F7D570F608fF9d92236a7D",
  verifierAddress:
    "0xA33FcC09F58B5391EF7955BB4dfD345827d3aAC5",
  amount: "0.01",
  workWindowSeconds: "3600",
  verificationWindowSeconds: "3600",
};

const roles: Array<{
  id: Role;
  label: string;
  description: string;
}> = [
  {
    id: "requester",
    label: "Requester",
    description: "Fund work, monitor delivery and release payment.",
  },
  {
    id: "provider",
    label: "Provider",
    description: "Complete the funded task and submit the result.",
  },
  {
    id: "verifier",
    label: "Verifier",
    description: "Review submitted work and resolve the escrow.",
  },
];

async function fetchJson<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      body &&
      typeof body === "object" &&
      "message" in body &&
      typeof body.message === "string"
        ? body.message
        : "Request failed with status " + response.status + ".";

    throw new Error(message);
  }

  return body as T;
}

function delay(milliseconds: number) {
  return new Promise((resolve) =>
    setTimeout(resolve, milliseconds),
  );
}

function shortenAddress(address: string) {
  if (address.length < 12) {
    return address;
  }

  return address.slice(0, 6) + "..." + address.slice(-4);
}

function formatDeadline(timestamp: string) {
  const milliseconds = Number(timestamp) * 1000;

  if (!Number.isFinite(milliseconds)) {
    return "Unavailable";
  }

  return new Date(milliseconds).toLocaleString();
}

function App() {
  const [selectedRole, setSelectedRole] =
    useState<Role>("requester");
  const [health, setHealth] =
    useState<HealthResponse | null>(null);
  const [job, setJob] = useState<JobResponse | null>(null);
  const [currentJobTitle, setCurrentJobTitle] = useState(
    "Veris API Integration Test",
  );
  const [currentJobId, setCurrentJobId] = useState("5");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] =
    useState<CreateJobForm>(defaultForm);
  const [creating, setCreating] = useState(false);
  const [creationStatus, setCreationStatus] =
    useState<string | null>(null);
  const [creationExplorerUrl, setCreationExplorerUrl] =
    useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [healthData, jobData] = await Promise.all([
        fetchJson<HealthResponse>("/health"),
        fetchJson<JobResponse>("/api/jobs/" + currentJobId),
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
  }, [currentJobId]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  async function handleCreateJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setCreationExplorerUrl(null);
    setCreationStatus("Sending escrow transaction to Circle...");

    try {
      const created = await fetchJson<CreateJobResponse>("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: createForm.title.trim(),
          taskDescription: createForm.taskDescription.trim(),
          providerAddress: createForm.providerAddress.trim(),
          verifierAddress: createForm.verifierAddress.trim(),
          amount: createForm.amount.trim(),
          workWindowSeconds: Number(createForm.workWindowSeconds),
          verificationWindowSeconds: Number(
            createForm.verificationWindowSeconds,
          ),
        }),
      });

      let terminalState = created.state;

      for (let attempt = 1; attempt <= 30; attempt += 1) {
        setCreationStatus(
          "Waiting for Arc confirmation... attempt " + attempt + "/30",
        );

        const transaction = await fetchJson<CircleTransaction>(
          "/api/transactions/" + created.transactionId,
        );

        terminalState = transaction.state ?? "UNKNOWN";

        if (
          terminalState === "FAILED" ||
          terminalState === "CANCELLED" ||
          terminalState === "DENIED"
        ) {
          throw new Error(
            "Circle transaction ended in state " + terminalState + ".",
          );
        }

        if (terminalState === "COMPLETE") {
          break;
        }

        await delay(3000);
      }

      if (terminalState !== "COMPLETE") {
        throw new Error(
          "Transaction did not complete within 90 seconds.",
        );
      }

      setCreationStatus("Confirming the new job in PostgreSQL...");

      let reconciliation: ReconciliationResponse | null = null;

      for (let attempt = 1; attempt <= 10; attempt += 1) {
        reconciliation = await fetchJson<ReconciliationResponse>(
          "/api/jobs/internal/" + created.internalJobId + "/reconcile",
          {
            method: "POST",
          },
        );

        if (reconciliation.reconciled) {
          break;
        }

        await delay(2000);
      }

      if (!reconciliation?.reconciled || !reconciliation.onchainJobId) {
        throw new Error(
          "The transaction completed, but the job was not reconciled yet.",
        );
      }

      const newJob = await fetchJson<JobResponse>(
        "/api/jobs/" + reconciliation.onchainJobId,
      );

      setCurrentJobId(newJob.jobId);
      setCurrentJobTitle(createForm.title.trim());
      setJob(newJob);
      setCreationExplorerUrl(reconciliation.explorerUrl ?? null);
      setCreationStatus(
        "Job #" + newJob.jobId + " is funded and active.",
      );
      setCreateForm(defaultForm);
    } catch (creationError) {
      setCreationStatus(
        creationError instanceof Error
          ? creationError.message
          : "The job could not be created.",
      );
    } finally {
      setCreating(false);
    }
  }

  const selectedRoleData = roles.find(
    (role) => role.id === selectedRole,
  );

  const completedSteps =
    job?.status === "RELEASED" || job?.status === "REFUNDED"
      ? 3
      : job?.status === "SUBMITTED"
        ? 2
        : job?.status === "FUNDED"
          ? 1
          : 0;

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

        <nav className="navigation">
          <button className="nav-item active">
            <span>◫</span>
            Overview
          </button>
          <button className="nav-item">
            <span>◇</span>
            Jobs
          </button>
          <button className="nav-item">
            <span>↗</span>
            Transactions
          </button>
        </nav>

        <div className="network-card">
          <div className="network-heading">
            <span className="status-dot" />
            Arc Testnet
          </div>
          <p>
            Escrow settlement powered by Circle
            developer-controlled wallets.
          </p>
        </div>
      </aside>

      <main className="dashboard">
        <header className="topbar">
          <div>
            <p className="eyebrow">VERIS CONTROL CENTRE</p>
            <h1>Escrow dashboard</h1>
            <p className="subtitle">
              Live visibility into verified work and onchain settlement.
            </p>
          </div>

          <div className="topbar-actions">
            {selectedRole === "requester" ? (
              <button
                className="primary-button"
                onClick={() => setShowCreateForm((value) => !value)}
              >
                {showCreateForm ? "Close form" : "+ Create job"}
              </button>
            ) : null}

            <button
              className="refresh-button"
              onClick={() => void loadDashboard()}
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh data"}
            </button>
          </div>
        </header>

        {error ? (
          <section className="error-banner">
            <div>
              <strong>Backend unavailable</strong>
              <p>{error}</p>
            </div>
            <button onClick={() => void loadDashboard()}>
              Try again
            </button>
          </section>
        ) : null}

        {showCreateForm && selectedRole === "requester" ? (
          <section className="create-panel">
            <div className="create-heading">
              <div>
                <p className="eyebrow">NEW ESCROW</p>
                <h2>Create and fund a job</h2>
                <p>
                  Submitting this form initiates a real 0.01 USDC Arc Testnet
                  escrow transaction from the requester wallet.
                </p>
              </div>
              <span className="testnet-badge">TESTNET</span>
            </div>

            <form className="create-form" onSubmit={handleCreateJob}>
              <label className="full-field">
                <span>Job title</span>
                <input
                  required
                  value={createForm.title}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Example: Design Veris landing page"
                />
              </label>

              <label className="full-field">
                <span>Task description</span>
                <textarea
                  required
                  rows={4}
                  value={createForm.taskDescription}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      taskDescription: event.target.value,
                    }))
                  }
                  placeholder="Describe the expected deliverable clearly."
                />
              </label>

              <label>
                <span>Provider address</span>
                <input
                  required
                  value={createForm.providerAddress}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      providerAddress: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                <span>Verifier address</span>
                <input
                  required
                  value={createForm.verifierAddress}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      verifierAddress: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                <span>Escrow amount (USDC)</span>
                <input
                  required
                  min="0.000001"
                  step="0.000001"
                  type="number"
                  value={createForm.amount}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                <span>Work window (seconds)</span>
                <input
                  required
                  min="60"
                  type="number"
                  value={createForm.workWindowSeconds}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      workWindowSeconds: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                <span>Verification window (seconds)</span>
                <input
                  required
                  min="60"
                  type="number"
                  value={createForm.verificationWindowSeconds}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      verificationWindowSeconds: event.target.value,
                    }))
                  }
                />
              </label>

              <div className="create-submit-row full-field">
                <div>
                  {creationStatus ? (
                    <p className="creation-status">{creationStatus}</p>
                  ) : (
                    <p className="creation-hint">
                      The button stays disabled while Circle and Arc confirm.
                    </p>
                  )}
                  {creationExplorerUrl ? (
                    <a
                      href={creationExplorerUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View creation transaction on Arcscan ↗
                    </a>
                  ) : null}
                </div>

                <button
                  className="primary-button create-submit"
                  disabled={creating}
                  type="submit"
                >
                  {creating ? "Creating job..." : "Fund escrow"}
                </button>
              </div>
            </form>
          </section>
        ) : null}

        <section className="role-switcher">
          {roles.map((role) => (
            <button
              key={role.id}
              className={
                selectedRole === role.id
                  ? "role-button selected"
                  : "role-button"
              }
              onClick={() => setSelectedRole(role.id)}
            >
              <strong>{role.label}</strong>
              <span>{role.description}</span>
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
            <strong>
              {health?.status === "ok" ? "Operational" : "Checking"}
            </strong>
            <small>{health?.network ?? "Arc Testnet"}</small>
          </article>
          <article className="stat-card">
            <span>Current role</span>
            <strong>{selectedRoleData?.label ?? "—"}</strong>
            <small>Role-specific workspace</small>
          </article>
        </section>

        <section className="content-grid">
          <article className="panel main-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">ACTIVE JOB</p>
                <h2>{currentJobTitle}</h2>
              </div>
              <span
                className={
                  "status-badge " +
                  (job?.status.toLowerCase() ?? "loading")
                }
              >
                {job?.status ?? (loading ? "Loading" : "Unavailable")}
              </span>
            </div>

            <div className="job-meta">
              <div>
                <span>Job ID</span>
                <strong>#{job?.jobId ?? "—"}</strong>
              </div>
              <div>
                <span>Escrow</span>
                <strong>{job ? job.amount + " USDC" : "—"}</strong>
              </div>
              <div>
                <span>Work deadline</span>
                <strong>
                  {job ? formatDeadline(job.workDeadline) : "—"}
                </strong>
              </div>
            </div>

            <div className="progress">
              {["Funded", "Submitted", "Released"].map((step, index) => (
                <div
                  className={
                    index < completedSteps
                      ? "progress-step complete"
                      : "progress-step"
                  }
                  key={step}
                >
                  <div className="progress-marker">
                    {index < completedSteps ? "✓" : index + 1}
                  </div>
                  <span>{step}</span>
                </div>
              ))}
            </div>

            <div className="role-action">
              <div>
                <span>{selectedRoleData?.label} workspace</span>
                <strong>
                  {selectedRole === "requester"
                    ? "Waiting for provider submission"
                    : selectedRole === "provider"
                      ? "Job is funded and ready for work"
                      : "Verification begins after submission"}
                </strong>
              </div>
              <span className="action-state">
                {job?.status ?? "Loading"}
              </span>
            </div>

            <div className="address-grid">
              <div>
                <span>Requester</span>
                <code>{job ? shortenAddress(job.requester) : "—"}</code>
              </div>
              <div>
                <span>Provider</span>
                <code>{job ? shortenAddress(job.provider) : "—"}</code>
              </div>
              <div>
                <span>Verifier</span>
                <code>{job ? shortenAddress(job.verifier) : "—"}</code>
              </div>
            </div>
          </article>

          <aside className="panel details-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">ONCHAIN DETAILS</p>
                <h2>Arc settlement</h2>
              </div>
            </div>

            <dl className="details-list">
              <div>
                <dt>Contract</dt>
                <dd>
                  {job ? shortenAddress(job.contractAddress) : "—"}
                </dd>
              </div>
              <div>
                <dt>Status code</dt>
                <dd>{job?.statusCode ?? "—"}</dd>
              </div>
              <div>
                <dt>Verification window</dt>
                <dd>
                  {job ? job.verificationWindow + " sec" : "—"}
                </dd>
              </div>
              <div>
                <dt>Task hash</dt>
                <dd>{job ? shortenAddress(job.taskHash) : "—"}</dd>
              </div>
            </dl>

            {job ? (
              <a
                className="explorer-link"
                href={job.explorerUrl}
                target="_blank"
                rel="noreferrer"
              >
                View contract on Arcscan
                <span>↗</span>
              </a>
            ) : null}
          </aside>
        </section>
      </main>
    </div>
  );
}

export default App;
