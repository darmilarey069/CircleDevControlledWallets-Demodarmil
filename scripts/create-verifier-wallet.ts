import process from "node:process";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

const apiKey = process.env.CIRCLE_API_KEY;
const entitySecret = process.env.CIRCLE_ENTITY_SECRET;

if (!apiKey || !entitySecret) {
  throw new Error(
    "Missing CIRCLE_API_KEY or CIRCLE_ENTITY_SECRET in .env",
  );
}

const client = initiateDeveloperControlledWalletsClient({
  apiKey,
  entitySecret,
});

async function main() {
  const walletSetResponse = await client.createWalletSet({
    name: "Veris Verifier Wallet Set",
  });

  const walletSetId = walletSetResponse.data?.walletSet?.id;

  if (!walletSetId) {
    throw new Error("Verifier wallet set creation failed");
  }

  const walletResponse = await client.createWallets({
    walletSetId,
    blockchains: ["ARC-TESTNET"],
    count: 1,
    accountType: "EOA",
  });

  console.log("Verifier wallet set ID:", walletSetId);
  console.dir(walletResponse.data, { depth: null });
}

main().catch((error) => {
  console.error("Unable to create verifier wallet:", error);
  process.exit(1);
});