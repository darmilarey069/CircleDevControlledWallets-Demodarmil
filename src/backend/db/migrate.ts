import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import {
  closeDatabase,
  databasePool,
} from "./pool.js";

type MigrationRow = {
  name: string;
};

const createMigrationsTableSql = [
  "CREATE TABLE IF NOT EXISTS schema_migrations (",
  "  name TEXT PRIMARY KEY,",
  "  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
  ")",
].join("\n");

const insertMigrationSql = [
  "INSERT INTO schema_migrations (name)",
  "VALUES ($1)",
].join("\n");

async function migrate() {
  const migrationsDirectory = resolve(
    "database",
    "migrations",
  );

  const migrationFiles = (
    await readdir(migrationsDirectory)
  )
    .filter((file) => file.endsWith(".sql"))
    .sort();

  const client = await databasePool.connect();

  try {
    await client.query(createMigrationsTableSql);

    const appliedResult =
      await client.query<MigrationRow>(
        "SELECT name FROM schema_migrations",
      );

    const appliedMigrations = new Set(
      appliedResult.rows.map((row) => row.name),
    );

    for (const migrationFile of migrationFiles) {
      if (appliedMigrations.has(migrationFile)) {
        console.log(
          "Migration already applied:",
          migrationFile,
        );

        continue;
      }

      const migrationSql = await readFile(
        resolve(
          migrationsDirectory,
          migrationFile,
        ),
        "utf8",
      );

      await client.query("BEGIN");

      try {
        await client.query(migrationSql);

        await client.query(
          insertMigrationSql,
          [migrationFile],
        );

        await client.query("COMMIT");

        console.log(
          "Migration applied:",
          migrationFile,
        );
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    client.release();
    await closeDatabase();
  }
}

migrate().catch((error) => {
  console.error(
    "Database migration failed:",
    error instanceof Error
      ? error.message
      : String(error),
  );

  process.exitCode = 1;
});
