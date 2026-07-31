import type { FastifyInstance } from "fastify";
import { parseUnits } from "viem";
import { z } from "zod";
import { HttpError } from "../errors/http-error.js";
import {
  approveResultTransaction,
  createJobTransaction,
  refundExpiredJobTransaction,
  refundVerificationTimeoutTransaction,
  rejectResultTransaction,
  submitResultTransaction,
} from "../services/veris/actions.js";

type JobParams = {
  jobId: string;
};

const jobIdSchema = z
  .string()
  .regex(
    /^\d+$/,
    "Job ID must be a non-negative whole number.",
  )
  .transform((value) => BigInt(value));

const addressSchema = z.string().regex(
  /^0x[a-fA-F0-9]{40}$/,
  "Value must be a valid EVM address.",
);

const amountSchema = z
  .string()
  .regex(
    /^(0|[1-9]\d*)(\.\d{1,18})?$/,
    "Amount must be a positive decimal with no more than 18 decimal places.",
  )
  .refine(
    (value) => parseUnits(value, 18) > 0n,
    "Amount must be greater than zero.",
  );

const createJobSchema = z.object({
  providerAddress: addressSchema,
  verifierAddress: addressSchema,
  taskDescription: z
    .string()
    .trim()
    .min(1)
    .max(10_000),
  amount: amountSchema,
  workWindowSeconds: z
    .number()
    .int()
    .positive()
    .max(31_536_000),
  verificationWindowSeconds: z
    .number()
    .int()
    .positive()
    .max(31_536_000),
});

const submitResultSchema = z.object({
  resultDescription: z
    .string()
    .trim()
    .min(1)
    .max(10_000),
});

function parseInput<T>(
  schema: z.ZodType<T>,
  input: unknown,
): T {
  const result = schema.safeParse(input);

  if (!result.success) {
    throw new HttpError(
      400,
      "INVALID_REQUEST",
      result.error.issues[0]?.message ??
        "The request is invalid.",
    );
  }

  return result.data;
}

function parseJobId(jobId: string) {
  return parseInput(jobIdSchema, jobId);
}

export function registerJobActionRoutes(
  app: FastifyInstance,
) {
  app.post("/api/jobs", async (request, reply) => {
    const input = parseInput(
      createJobSchema,
      request.body,
    );

    const result =
      await createJobTransaction(input);

    return reply.code(202).send(result);
  });

  app.post<{
    Params: JobParams;
  }>(
    "/api/jobs/:jobId/submit",
    async (request, reply) => {
      const jobId = parseJobId(
        request.params.jobId,
      );

      const input = parseInput(
        submitResultSchema,
        request.body,
      );

      const result =
        await submitResultTransaction(
          jobId,
          input.resultDescription,
        );

      return reply.code(202).send(result);
    },
  );

  app.post<{
    Params: JobParams;
  }>(
    "/api/jobs/:jobId/approve",
    async (request, reply) => {
      const result =
        await approveResultTransaction(
          parseJobId(request.params.jobId),
        );

      return reply.code(202).send(result);
    },
  );

  app.post<{
    Params: JobParams;
  }>(
    "/api/jobs/:jobId/reject",
    async (request, reply) => {
      const result =
        await rejectResultTransaction(
          parseJobId(request.params.jobId),
        );

      return reply.code(202).send(result);
    },
  );

  app.post<{
    Params: JobParams;
  }>(
    "/api/jobs/:jobId/refund-expired",
    async (request, reply) => {
      const result =
        await refundExpiredJobTransaction(
          parseJobId(request.params.jobId),
        );

      return reply.code(202).send(result);
    },
  );

  app.post<{
    Params: JobParams;
  }>(
    "/api/jobs/:jobId/refund-verification-timeout",
    async (request, reply) => {
      const result =
        await refundVerificationTimeoutTransaction(
          parseJobId(request.params.jobId),
        );

      return reply.code(202).send(result);
    },
  );
}
