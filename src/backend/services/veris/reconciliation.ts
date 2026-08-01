import {
  decodeEventLog,
  parseAbi,
  type Hex,
} from "viem";
import { env } from "../../config/env.js";
import {
  completeJobCreation,
  findJobCreationContext,
  updateCreationTransactionState,
} from "../../db/repositories/job-reconciliation.js";
import { markJobCreationFailed } from "../../db/repositories/jobs.js";
import { HttpError } from "../../errors/http-error.js";
import {
  arcClient,
  verisContractAddress,
} from "../arc/client.js";
import { readJob } from "../arc/jobs.js";
import { readCircleTransaction } from "../circle/transactions.js";

const jobCreatedEventAbi = parseAbi([
  "event JobCreated(uint256 indexed jobId, address indexed requester, address indexed provider, address verifier, uint256 amount, bytes32 taskHash, uint64 workDeadline, uint64 verificationWindow)",
]);

const failedStates = new Set([
  "FAILED",
  "CANCELLED",
  "DENIED",
]);

export async function reconcileJobCreation(
  internalJobId: string,
) {
  const context =
    await findJobCreationContext(internalJobId);

  if (
    context.application_status === "ACTIVE" &&
    context.onchain_job_id
  ) {
    return {
      internalJobId,
      onchainJobId: context.onchain_job_id,
      chainStatus: context.chain_status,
      arcTransactionHash:
        context.arc_transaction_hash,
      explorerUrl: context.explorer_url,
      reconciled: true,
      alreadyReconciled: true,
    };
  }

  const transaction =
    await readCircleTransaction(
      context.circle_transaction_id,
    );

  const state = transaction.state ?? "UNKNOWN";

  await updateCreationTransactionState(
    internalJobId,
    context.circle_transaction_id,
    state,
  );

  if (failedStates.has(state)) {
    const message =
      "Circle transaction ended in state " +
      state +
      ".";

    await markJobCreationFailed(
      internalJobId,
      message,
    );

    throw new HttpError(
      409,
      "JOB_CREATION_FAILED",
      message,
    );
  }

  if (state !== "COMPLETE") {
    return {
      internalJobId,
      transactionId:
        context.circle_transaction_id,
      state,
      reconciled: false,
    };
  }

  const txHash = transaction.txHash;

  if (
    !txHash ||
    !/^0x[0-9a-fA-F]{64}$/.test(txHash)
  ) {
    throw new HttpError(
      502,
      "ARC_TRANSACTION_HASH_MISSING",
      "The completed Circle transaction has no valid Arc transaction hash.",
    );
  }

  const receipt =
    await arcClient.getTransactionReceipt({
      hash: txHash as Hex,
    });

  if (receipt.status !== "success") {
    throw new HttpError(
      502,
      "ARC_TRANSACTION_REVERTED",
      "The Arc transaction did not execute successfully.",
    );
  }

  let onchainJobId: bigint | undefined;

  for (const log of receipt.logs) {
    if (
      log.address.toLowerCase() !==
      verisContractAddress.toLowerCase()
    ) {
      continue;
    }

    try {
      const decoded = decodeEventLog({
        abi: jobCreatedEventAbi,
        eventName: "JobCreated",
        data: log.data,
        topics: log.topics,
      });

      onchainJobId = decoded.args.jobId;
      break;
    } catch {
      continue;
    }
  }

  if (onchainJobId === undefined) {
    throw new HttpError(
      502,
      "JOB_CREATED_EVENT_NOT_FOUND",
      "The Arc receipt did not contain the JobCreated event.",
    );
  }

  const onchainJob =
    await readJob(onchainJobId);

  if (!onchainJob) {
    throw new HttpError(
      502,
      "ONCHAIN_JOB_NOT_FOUND",
      "The created job could not be read from Arc.",
    );
  }

  if (
    onchainJob.taskHash.toLowerCase() !==
    context.task_hash.toLowerCase()
  ) {
    throw new HttpError(
      409,
      "JOB_TASK_HASH_MISMATCH",
      "The onchain job does not match the database job.",
    );
  }

  const explorerUrl =
    env.ARC_EXPLORER_URL.replace(/\/$/, "") +
    "/tx/" +
    txHash;

  await completeJobCreation({
    internalJobId,
    circleTransactionId:
      context.circle_transaction_id,
    onchainJobId: onchainJobId.toString(),
    chainStatusCode:
      onchainJob.statusCode,
    chainStatus: onchainJob.status,
    arcTransactionHash: txHash,
    explorerUrl,
  });

  return {
    internalJobId,
    transactionId:
      context.circle_transaction_id,
    onchainJobId: onchainJobId.toString(),
    state,
    chainStatus: onchainJob.status,
    arcTransactionHash: txHash,
    explorerUrl,
    reconciled: true,
    alreadyReconciled: false,
  };
}
