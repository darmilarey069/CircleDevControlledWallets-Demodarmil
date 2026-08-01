import {
  closeDatabase,
  databasePool,
} from "./pool.js";

type TableRow = {
  table_name: string;
};

type MigrationRow = {
  name: string;
  applied_at: Date;
};

async function verifyDatabase() {
  const tablesResult =
    await databasePool.query<TableRow>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name",
      ["public"],
    );

  const migrationsResult =
    await databasePool.query<MigrationRow>(
      "SELECT name, applied_at FROM schema_migrations ORDER BY applied_at",
    );

  console.log(
    "TABLES:",
    tablesResult.rows.map(
      (row) => row.table_name,
    ),
  );

  console.log(
    "MIGRATIONS:",
    migrationsResult.rows,
  );
}

async function main() {
  try {
    await verifyDatabase();
  } finally {
    await closeDatabase();
  }
}

main().catch((error) => {
  console.error(
    "DATABASE VERIFY FAILED:",
    error instanceof Error
      ? error.message
      : String(error),
  );

  process.exitCode = 1;
});
