import { env } from "../config/env.js";
import {
  closeDatabase,
  databasePool,
} from "./pool.js";

type ProfileSeed = {
  displayName: string;
  walletAddress: string;
  circleWalletId: string;
};

type ProfileRow = {
  id: string;
  display_name: string;
  wallet_address: string;
  circle_wallet_id: string | null;
};

const profiles: ProfileSeed[] = [
  {
    displayName: "Veris Test Requester",
    walletAddress:
      env.VERIS_REQUESTER_ADDRESS.toLowerCase(),
    circleWalletId:
      env.VERIS_REQUESTER_WALLET_ID,
  },
  {
    displayName: "Veris Test Provider",
    walletAddress:
      env.VERIS_PROVIDER_ADDRESS.toLowerCase(),
    circleWalletId:
      env.VERIS_PROVIDER_WALLET_ID,
  },
  {
    displayName: "Veris Test Verifier",
    walletAddress:
      env.VERIS_VERIFIER_ADDRESS.toLowerCase(),
    circleWalletId:
      env.VERIS_VERIFIER_WALLET_ID,
  },
];

const upsertProfileSql = [
  "INSERT INTO profiles (",
  "  display_name,",
  "  wallet_address,",
  "  circle_wallet_id",
  ")",
  "VALUES ($1, $2, $3)",
  "ON CONFLICT (wallet_address)",
  "DO UPDATE SET",
  "  display_name = EXCLUDED.display_name,",
  "  circle_wallet_id = EXCLUDED.circle_wallet_id",
  "RETURNING",
  "  id,",
  "  display_name,",
  "  wallet_address,",
  "  circle_wallet_id",
].join("\n");

async function seedProfiles() {
  const client = await databasePool.connect();

  try {
    await client.query("BEGIN");

    for (const profile of profiles) {
      const result =
        await client.query<ProfileRow>(
          upsertProfileSql,
          [
            profile.displayName,
            profile.walletAddress,
            profile.circleWalletId,
          ],
        );

      console.log(
        "PROFILE SEEDED:",
        result.rows[0],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await closeDatabase();
  }
}

seedProfiles().catch((error) => {
  console.error(
    "PROFILE SEED FAILED:",
    error instanceof Error
      ? error.message
      : String(error),
  );

  process.exitCode = 1;
});
