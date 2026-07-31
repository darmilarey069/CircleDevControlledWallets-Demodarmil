import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  readJob,
  readNextJobId,
} from "../services/arc/jobs.js";

const jobIdSchema = z
  .string()
  .regex(
    /^\d+$/,
    "Job ID must be a non-negative whole number.",
  )
  .transform((value) => BigInt(value));

export function registerJobRoutes(
  app: FastifyInstance,
) {
  app.get("/api/jobs/next-id", async () => {
    return readNextJobId();
  });

  app.get<{
    Params: {
      jobId: string;
    };
  }>("/api/jobs/:jobId", async (request, reply) => {
    const parsedJobId = jobIdSchema.safeParse(
      request.params.jobId,
    );

    if (!parsedJobId.success) {
      return reply.code(400).send({
        error: "INVALID_JOB_ID",
        message:
          parsedJobId.error.issues[0]?.message ??
          "Invalid job ID.",
      });
    }

    const job = await readJob(parsedJobId.data);

    if (!job) {
      return reply.code(404).send({
        error: "JOB_NOT_FOUND",
        message:
          "No funded or completed job exists with this ID.",
      });
    }

    return job;
  });
}
