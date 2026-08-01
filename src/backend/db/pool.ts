import { Pool } from "pg";
import { env } from "../config/env.js";

export const databasePool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

databasePool.on("error", (error) => {
  console.error(
    "Unexpected PostgreSQL pool error:",
    error,
  );
});

export async function closeDatabase() {
  await databasePool.end();
}
