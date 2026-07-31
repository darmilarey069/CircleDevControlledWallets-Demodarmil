import Fastify, {
  type FastifyInstance,
} from "fastify";
import { registerJobRoutes } from "./routes/jobs.js";

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: true,
  });

  app.setErrorHandler((error, request, reply) => {
    app.log.error(error);

    const message =
      error instanceof Error
        ? error.message.toLowerCase()
        : String(error).toLowerCase();

    if (message.includes("request limit reached")) {
      return reply.code(503).send({
        error: "ARC_RPC_RATE_LIMITED",
        message:
          "Arc Testnet RPC is temporarily rate-limiting requests.",
      });
    }

    return reply.code(500).send({
      error: "INTERNAL_SERVER_ERROR",
      message: "The request could not be completed.",
    });
  });

  app.get("/health", async () => {
    return {
      status: "ok",
      service: "veris-api",
      network: "arc-testnet",
    };
  });

  registerJobRoutes(app);

  return app;
}

