import { HttpError } from "../../errors/http-error.js";
import { verisContractAddress } from "../arc/client.js";
import { circleClient } from "./client.js";

type CreateContractTransactionInput = {
  walletId: string;
  abiFunctionSignature: string;
  abiParameters: string[];
  amount?: string;
};

export async function createVerisContractTransaction(
  input: CreateContractTransactionInput,
) {
  const response =
    await circleClient.createContractExecutionTransaction({
      walletId: input.walletId,
      contractAddress: verisContractAddress,
      abiFunctionSignature: input.abiFunctionSignature,
      abiParameters: input.abiParameters,
      ...(input.amount
        ? {
            amount: input.amount,
          }
        : {}),
      fee: {
        type: "level",
        config: {
          feeLevel: "MEDIUM",
        },
      },
    });

  const transactionId = response.data?.id;

  if (!transactionId) {
    throw new Error(
      "Circle did not return a transaction ID.",
    );
  }

  return {
    transactionId,
    state: response.data?.state ?? "UNKNOWN",
  };
}
export async function readCircleTransaction(
  transactionId: string,
) {
  const response = await circleClient.getTransaction({
    id: transactionId,
  });

  const transaction = response.data?.transaction;

  if (!transaction) {
    throw new HttpError(
      404,
      "TRANSACTION_NOT_FOUND",
      "Circle transaction was not found.",
    );
  }

  return transaction;
}
