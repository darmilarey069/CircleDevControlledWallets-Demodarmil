import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { HttpError } from "../errors/http-error.js";
import { readCircleTransaction } from "../services/circle/transactions.js";

const transactionIdSchema = z
  .string()
  .uuid("Transaction ID must be a valid UUID.");

export function registerTransactionRoutes(
  app: FastifyInstance,
) {
  app.get<{
    Params: {
      transactionId: string;
    };
  }>(
    "/api/transactions/:transactionId",
    async (request) => {
      const parsedTransactionId =
        transactionIdSchema.safeParse(
          request.params.transactionId,
        );

      if (!parsedTransactionId.success) {
        throw new HttpError(
          400,
          "INVALID_TRANSACTION_ID",
          parsedTransactionId.error.issues[0]?.message ??
            "Invalid transaction ID.",
        );
      }

      return readCircleTransaction(
        parsedTransactionId.data,
      );
    },
  );
}
