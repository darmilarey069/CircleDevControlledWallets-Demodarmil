import {
  closeDatabase,
  databasePool,
} from "./pool.js";

const internalJobId =
  process.argv[2];

if (!internalJobId) {
  throw new Error(
    "Provide an internal job ID.",
  );
}

async function inspectJob() {
  const result = await databasePool.query(
    [
      "SELECT",
      "  id,",
      "  onchain_job_id,",
      "  title,",
      "  task_hash,",
      "  amount,",
      "  application_status,",
      "  chain_status_code,",
      "  chain_status,",
      "  last_error",
      "FROM jobs",
      "WHERE id = $1",
    ].join("\n"),
    [internalJobId],
  );

  console.log("DATABASE JOB:");
  console.dir(result.rows[0] ?? null, {
    depth: null,
  });
}

async function main() {
  try {
    await inspectJob();
  } finally {
    await closeDatabase();
  }
}

main().catch((error) => {
  console.error(
    "JOB INSPECTION FAILED:",
    error instanceof Error
      ? error.message
      : String(error),
  );

  process.exitCode = 1;
});
