import { closeDatabase } from "./pool.js";
import { reconcileJobCreation } from "../services/veris/reconciliation.js";

const internalJobId = process.argv[2];

if (!internalJobId) {
  throw new Error(
    "Provide an internal job ID.",
  );
}

async function main() {
  try {
    const result =
      await reconcileJobCreation(
        internalJobId,
      );

    console.log("RECONCILIATION RESULT:");
    console.dir(result, {
      depth: null,
    });
  } finally {
    await closeDatabase();
  }
}

main().catch((error) => {
  console.error(
    "RECONCILIATION FAILED:",
    error instanceof Error
      ? error.message
      : String(error),
  );

  process.exitCode = 1;
});
