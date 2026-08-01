import type { PoolClient } from "pg";
import { HttpError } from "../../errors/http-error.js";
import { databasePool } from "../pool.js";

type ProfileRow = {
  id: string;
  wallet_address: string;
};

type JobRow = {
  id: string;
};

type CreateDraftJobInput = {
  title: string;
  taskDescription: string;
  requesterAddress: string;
  providerAddress: string;
  verifierAddress: string;
  taskHash: string;
  amount: string;
  workDeadline: Date;
  verificationWindowSeconds: number;
};

type MarkCreationPendingInput = {
  internalJobId: string;
  circleTransactionId: string;
  circleState: string;
  taskHash: string;
  workDeadline: Date;
  verificationWindowSeconds: number;
};

async function resolveProfileIds(
  client: PoolClient,
  addresses: {
    requester: string;
    provider: string;
    verifier: string;
  },
) {
  const normalizedAddresses = [
    addresses.requester.toLowerCase(),
    addresses.provider.toLowerCase(),
    addresses.verifier.toLowerCase(),
  ];

  const result = await client.query<ProfileRow>(
    [
      "SELECT id, wallet_address",
      "FROM profiles",
      "WHERE LOWER(wallet_address) = ANY($1::text[])",
    ].join("\n"),
    [normalizedAddresses],
  );

  const profilesByAddress = new Map(
    result.rows.map((row) => [
      row.wallet_address.toLowerCase(),
      row.id,
    ]),
  );

  const requesterProfileId = profilesByAddress.get(
    addresses.requester.toLowerCase(),
  );

  const providerProfileId = profilesByAddress.get(
    addresses.provider.toLowerCase(),
  );

  const verifierProfileId = profilesByAddress.get(
    addresses.verifier.toLowerCase(),
  );

  if (
    !requesterProfileId ||
    !providerProfileId ||
    !verifierProfileId
  ) {
    throw new HttpError(
      409,
      "PROFILE_NOT_CONFIGURED",
      "Requester, provider, and verifier must have Veris profiles before creating a job.",
    );
  }

  return {
    requesterProfileId,
    providerProfileId,
    verifierProfileId,
  };
}

export async function createDraftJob(
  input: CreateDraftJobInput,
) {
  const client = await databasePool.connect();

  try {
    await client.query("BEGIN");

    const profileIds = await resolveProfileIds(
      client,
      {
        requester: input.requesterAddress,
        provider: input.providerAddress,
        verifier: input.verifierAddress,
      },
    );

    const result = await client.query<JobRow>(
      [
        "INSERT INTO jobs (",
        "  title,",
        "  task_description,",
        "  requester_profile_id,",
        "  provider_profile_id,",
        "  verifier_profile_id,",
        "  task_hash,",
        "  amount,",
        "  work_deadline,",
        "  verification_window_seconds,",
        "  chain_status_code,",
        "  chain_status,",
        "  application_status",
        ")",
        "VALUES (",
        "  $1, $2, $3, $4, $5, $6,",
        "  $7, $8, $9, 0, 'NONE', 'DRAFT'",
        ")",
        "RETURNING id",
      ].join("\n"),
      [
        input.title,
        input.taskDescription,
        profileIds.requesterProfileId,
        profileIds.providerProfileId,
        profileIds.verifierProfileId,
        input.taskHash,
        input.amount,
        input.workDeadline,
        input.verificationWindowSeconds,
      ],
    );

    await client.query("COMMIT");

    const job = result.rows[0];

    if (!job) {
      throw new Error(
        "PostgreSQL did not return the created job.",
      );
    }

    return job.id;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function markJobCreationPending(
  input: MarkCreationPendingInput,
) {
  const client = await databasePool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      [
        "UPDATE jobs",
        "SET",
        "  application_status = 'CREATE_PENDING',",
        "  task_hash = $2,",
        "  work_deadline = $3,",
        "  verification_window_seconds = $4,",
        "  last_error = NULL",
        "WHERE id = $1",
      ].join("\n"),
      [
        input.internalJobId,
        input.taskHash,
        input.workDeadline,
        input.verificationWindowSeconds,
      ],
    );

    await client.query(
      [
        "INSERT INTO job_transactions (",
        "  job_id,",
        "  action,",
        "  circle_transaction_id,",
        "  state,",
        "  metadata",
        ")",
        "VALUES ($1, 'CREATE_JOB', $2, $3, $4)",
      ].join("\n"),
      [
        input.internalJobId,
        input.circleTransactionId,
        input.circleState,
        {
          taskHash: input.taskHash,
          workDeadline:
            input.workDeadline.toISOString(),
          verificationWindowSeconds:
            input.verificationWindowSeconds,
        },
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

export async function markJobCreationFailed(
  internalJobId: string,
  message: string,
) {
  await databasePool.query(
    [
      "UPDATE jobs",
      "SET",
      "  application_status = 'CREATE_FAILED',",
      "  last_error = $2",
      "WHERE id = $1",
    ].join("\n"),
    [internalJobId, message],
  );
}
