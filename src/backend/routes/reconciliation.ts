import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { HttpError } from "../errors/http-error.js";
import { reconcileJobCreation } from "../services/veris/reconciliation.js";

const internalJobIdSchema = z
  .string()
  .uuid("Internal job ID must be a valid UUID.");

export function registerReconciliationRoutes(
  app: FastifyInstance,
) {
  app.post<{
    Params: {
      internalJobId: string;
    };
  }>(
    "/api/jobs/internal/:internalJobId/reconcile",
    async (request, reply) => {
      const parsed =
        internalJobIdSchema.safeParse(
          request.params.internalJobId,
        );

      if (!parsed.success) {
        throw new HttpError(
          400,
          "INVALID_INTERNAL_JOB_ID",
          parsed.error.issues[0]?.message ??
            "Invalid internal job ID.",
        );
      }

      const result =
        await reconcileJobCreation(
          parsed.data,
        );

      return reply
        .code(result.reconciled ? 200 : 202)
        .send(result);
    },
  );
}
