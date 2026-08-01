import { HttpError } from "../../errors/http-error.js";
import { databasePool } from "../pool.js";

type JobCreationContextRow = {
  internal_job_id: string;
  application_status: string;
  onchain_job_id: string | null;
  chain_status: string;
  task_hash: string;
  circle_transaction_id: string;
  arc_transaction_hash: string | null;
  explorer_url: string | null;
};

type CompleteJobCreationInput = {
  internalJobId: string;
  circleTransactionId: string;
  onchainJobId: string;
  chainStatusCode: number;
  chainStatus: string;
  arcTransactionHash: string;
  explorerUrl: string;
};

export async function findJobCreationContext(
  internalJobId: string,
) {
  const result =
    await databasePool.query<JobCreationContextRow>(
      [
        "SELECT",
        "jobs.id AS internal_job_id,",
        "jobs.application_status,",
        "jobs.onchain_job_id,",
        "jobs.chain_status,",
        "jobs.task_hash,",
        "job_transactions.circle_transaction_id,",
        "job_transactions.arc_transaction_hash,",
        "job_transactions.explorer_url",
        "FROM jobs",
        "INNER JOIN job_transactions",
        "ON job_transactions.job_id = jobs.id",
        "WHERE jobs.id = $1",
        "AND job_transactions.action = 'CREATE_JOB'",
        "ORDER BY job_transactions.created_at DESC",
        "LIMIT 1",
      ].join(" "),
      [internalJobId],
    );

  const context = result.rows[0];

  if (!context) {
    throw new HttpError(
      404,
      "JOB_CREATION_RECORD_NOT_FOUND",
      "No creation transaction exists for this job.",
    );
  }

  return context;
}

export async function updateCreationTransactionState(
  internalJobId: string,
  circleTransactionId: string,
  state: string,
) {
  await databasePool.query(
    [
      "UPDATE job_transactions",
      "SET state = $3, updated_at = NOW()",
      "WHERE job_id = $1",
      "AND circle_transaction_id = $2",
      "AND action = 'CREATE_JOB'",
    ].join(" "),
    [
      internalJobId,
      circleTransactionId,
      state,
    ],
  );
}

export async function completeJobCreation(
  input: CompleteJobCreationInput,
) {
  const client = await databasePool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      [
        "UPDATE jobs",
        "SET onchain_job_id = $2,",
        "application_status = 'ACTIVE',",
        "chain_status_code = $3,",
        "chain_status = $4,",
        "last_error = NULL,",
        "updated_at = NOW()",
        "WHERE id = $1",
      ].join(" "),
      [
        input.internalJobId,
        input.onchainJobId,
        input.chainStatusCode,
        input.chainStatus,
      ],
    );

    await client.query(
      [
        "UPDATE job_transactions",
        "SET state = 'COMPLETE',",
        "arc_transaction_hash = $3,",
        "explorer_url = $4,",
        "metadata = COALESCE(metadata, '{}'::jsonb) || $5::jsonb,",
        "updated_at = NOW()",
        "WHERE job_id = $1",
        "AND circle_transaction_id = $2",
        "AND action = 'CREATE_JOB'",
      ].join(" "),
      [
        input.internalJobId,
        input.circleTransactionId,
        input.arcTransactionHash,
        input.explorerUrl,
        JSON.stringify({
          onchainJobId: input.onchainJobId,
          chainStatus: input.chainStatus,
        }),
      ],
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
