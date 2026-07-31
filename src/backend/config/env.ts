import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  HOST: z.string().min(1).default("127.0.0.1"),

  PORT: z.coerce
    .number()
    .int()
    .min(1)
    .max(65535)
    .default(3000),

  CIRCLE_API_KEY: z.string().min(1),

  CIRCLE_ENTITY_SECRET: z.string().min(1),

  ARC_RPC_URL: z
    .url()
    .default("https://rpc.testnet.arc.network"),

  VERIS_CONTRACT_ADDRESS: z
    .string()
    .regex(
      /^0x[a-fA-F0-9]{40}$/,
      "VERIS_CONTRACT_ADDRESS must be a valid EVM address.",
    )
    .default("0x635470aff03f11eb4f16cd11c4b7c4884132204c"),
});

const result = environmentSchema.safeParse(process.env);

if (!result.success) {
  const fieldErrors = JSON.stringify(
    result.error.flatten().fieldErrors,
    null,
    2,
  );

  throw new Error(
    "Invalid environment configuration:`n" + fieldErrors,
  );
}

export const env = result.data;
