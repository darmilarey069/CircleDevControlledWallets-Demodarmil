import { createHash } from "node:crypto";
import { getAddress } from "viem";
import { env } from "../../config/env.js";
import { HttpError } from "../../errors/http-error.js";
import { readJob } from "../arc/jobs.js";
import { createVerisContractTransaction } from "../circle/transactions.js";

type VerisJob = NonNullable<
  Awaited<ReturnType<typeof readJob>>
>;

type CreateJobInput = {
  providerAddress: string;
  verifierAddress: string;
  taskDescription: string;
  amount: string;
  workWindowSeconds: number;
  verificationWindowSeconds: number;
};

function hashContent(content: string) {
  return (
    "0x" +
    createHash("sha256")
      .update(content)
      .digest("hex")
  );
}

async function requireJob(
  jobId: bigint,
): Promise<VerisJob> {
  const job = await readJob(jobId);

  if (!job) {
    throw new HttpError(
      404,
      "JOB_NOT_FOUND",
      "No job exists with this ID.",
    );
  }

  return job;
}

function requireStatus(
  job: VerisJob,
  expectedStatusCode: number,
  expectedStatus: string,
) {
  if (job.statusCode !== expectedStatusCode) {
    throw new HttpError(
      409,
      "INVALID_JOB_STATE",
      "This action requires job status " +
        expectedStatus +
        ", but the current status is " +
        job.status +
        ".",
    );
  }
}

function requireConfiguredRole(
  onchainAddress: string,
  configuredAddress: string,
  role: string,
) {
  if (
    onchainAddress.toLowerCase() !==
    configuredAddress.toLowerCase()
  ) {
    throw new HttpError(
      409,
      "ROLE_WALLET_NOT_CONFIGURED",
      "The backend does not have a Circle wallet configured for this job's " +
        role +
        ".",
    );
  }
}

export async function createJobTransaction(
  input: CreateJobInput,
) {
  const workDeadline =
    Math.floor(Date.now() / 1000) +
    input.workWindowSeconds;

  const taskHash = hashContent(
    input.taskDescription,
  );

  const transaction =
    await createVerisContractTransaction({
      walletId: env.VERIS_REQUESTER_WALLET_ID,
      abiFunctionSignature:
        "createJob(address,address,bytes32,uint64,uint64)",
      abiParameters: [
        getAddress(input.providerAddress),
        getAddress(input.verifierAddress),
        taskHash,
        workDeadline.toString(),
        input.verificationWindowSeconds.toString(),
      ],
      amount: input.amount,
    });

  return {
    action: "CREATE_JOB",
    ...transaction,
    taskHash,
    workDeadline: workDeadline.toString(),
    verificationWindow:
      input.verificationWindowSeconds.toString(),
  };
}

export async function submitResultTransaction(
  jobId: bigint,
  resultDescription: string,
) {
  const job = await requireJob(jobId);

  requireStatus(job, 1, "FUNDED");
  requireConfiguredRole(
    job.provider,
    env.VERIS_PROVIDER_ADDRESS,
    "provider",
  );

  const resultHash = hashContent(
    resultDescription,
  );

  const transaction =
    await createVerisContractTransaction({
      walletId: env.VERIS_PROVIDER_WALLET_ID,
      abiFunctionSignature:
        "submitResult(uint256,bytes32)",
      abiParameters: [
        jobId.toString(),
        resultHash,
      ],
    });

  return {
    action: "SUBMIT_RESULT",
    jobId: jobId.toString(),
    resultHash,
    ...transaction,
  };
}

export async function approveResultTransaction(
  jobId: bigint,
) {
  const job = await requireJob(jobId);

  requireStatus(job, 2, "SUBMITTED");
  requireConfiguredRole(
    job.verifier,
    env.VERIS_VERIFIER_ADDRESS,
    "verifier",
  );

  const transaction =
    await createVerisContractTransaction({
      walletId: env.VERIS_VERIFIER_WALLET_ID,
      abiFunctionSignature:
        "approveResult(uint256)",
      abiParameters: [jobId.toString()],
    });

  return {
    action: "APPROVE_RESULT",
    jobId: jobId.toString(),
    ...transaction,
  };
}

export async function rejectResultTransaction(
  jobId: bigint,
) {
  const job = await requireJob(jobId);

  requireStatus(job, 2, "SUBMITTED");
  requireConfiguredRole(
    job.verifier,
    env.VERIS_VERIFIER_ADDRESS,
    "verifier",
  );

  const transaction =
    await createVerisContractTransaction({
      walletId: env.VERIS_VERIFIER_WALLET_ID,
      abiFunctionSignature:
        "rejectResult(uint256)",
      abiParameters: [jobId.toString()],
    });

  return {
    action: "REJECT_RESULT",
    jobId: jobId.toString(),
    ...transaction,
  };
}

export async function refundExpiredJobTransaction(
  jobId: bigint,
) {
  const job = await requireJob(jobId);

  requireStatus(job, 1, "FUNDED");
  requireConfiguredRole(
    job.requester,
    env.VERIS_REQUESTER_ADDRESS,
    "requester",
  );

  const currentTimestamp = BigInt(
    Math.floor(Date.now() / 1000),
  );

  if (
    currentTimestamp <= BigInt(job.workDeadline)
  ) {
    throw new HttpError(
      409,
      "WORK_DEADLINE_NOT_REACHED",
      "The work deadline has not passed.",
    );
  }

  const transaction =
    await createVerisContractTransaction({
      walletId: env.VERIS_REQUESTER_WALLET_ID,
      abiFunctionSignature:
        "refundExpiredJob(uint256)",
      abiParameters: [jobId.toString()],
    });

  return {
    action: "REFUND_EXPIRED_JOB",
    jobId: jobId.toString(),
    ...transaction,
  };
}

export async function refundVerificationTimeoutTransaction(
  jobId: bigint,
) {
  const job = await requireJob(jobId);

  requireStatus(job, 2, "SUBMITTED");
  requireConfiguredRole(
    job.requester,
    env.VERIS_REQUESTER_ADDRESS,
    "requester",
  );

  const currentTimestamp = BigInt(
    Math.floor(Date.now() / 1000),
  );

  if (
    currentTimestamp <=
    BigInt(job.verificationDeadline)
  ) {
    throw new HttpError(
      409,
      "VERIFICATION_DEADLINE_NOT_REACHED",
      "The verification deadline has not passed.",
    );
  }

  const transaction =
    await createVerisContractTransaction({
      walletId: env.VERIS_REQUESTER_WALLET_ID,
      abiFunctionSignature:
        "refundAfterVerificationTimeout(uint256)",
      abiParameters: [jobId.toString()],
    });

  return {
    action: "REFUND_VERIFICATION_TIMEOUT",
    jobId: jobId.toString(),
    ...transaction,
  };
}
