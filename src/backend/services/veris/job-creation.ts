import { createHash } from "node:crypto";
import { env } from "../../config/env.js";
import {
  createDraftJob,
  markJobCreationFailed,
  markJobCreationPending,
} from "../../db/repositories/jobs.js";
import { createJobTransaction } from "./actions.js";

type CreatePersistedJobInput = {
  title: string;
  providerAddress: string;
  verifierAddress: string;
  taskDescription: string;
  amount: string;
  workWindowSeconds: number;
  verificationWindowSeconds: number;
};

function hashTask(taskDescription: string) {
  return (
    "0x" +
    createHash("sha256")
      .update(taskDescription)
      .digest("hex")
  );
}

export async function createPersistedJob(
  input: CreatePersistedJobInput,
) {
  const taskHash = hashTask(
    input.taskDescription,
  );

  const provisionalWorkDeadline = new Date(
    (
      Math.floor(Date.now() / 1000) +
      input.workWindowSeconds
    ) * 1000,
  );

  const internalJobId = await createDraftJob({
    title: input.title,
    taskDescription: input.taskDescription,
    requesterAddress:
      env.VERIS_REQUESTER_ADDRESS,
    providerAddress: input.providerAddress,
    verifierAddress: input.verifierAddress,
    taskHash,
    amount: input.amount,
    workDeadline: provisionalWorkDeadline,
    verificationWindowSeconds:
      input.verificationWindowSeconds,
  });

  try {
    const transaction =
      await createJobTransaction({
        providerAddress: input.providerAddress,
        verifierAddress: input.verifierAddress,
        taskDescription: input.taskDescription,
        amount: input.amount,
        workWindowSeconds:
          input.workWindowSeconds,
        verificationWindowSeconds:
          input.verificationWindowSeconds,
      });

    await markJobCreationPending({
      internalJobId,
      circleTransactionId:
        transaction.transactionId,
      circleState: transaction.state,
      taskHash: transaction.taskHash,
      workDeadline: new Date(
        Number(transaction.workDeadline) * 1000,
      ),
      verificationWindowSeconds:
        input.verificationWindowSeconds,
    });

    return {
      internalJobId,
      ...transaction,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    try {
      await markJobCreationFailed(
        internalJobId,
        message,
      );
    } catch {
      // Preserve the original Circle or application error.
    }

    throw error;
  }
}
