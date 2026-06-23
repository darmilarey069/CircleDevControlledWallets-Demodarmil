import "dotenv/config";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

const client = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY!,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
});

async function main() {
  const walletSetResponse = await client.createWalletSet({
    name: "My First Dev-Controlled Wallet Set",
  });

  const walletSet = walletSetResponse.data?.walletSet;

  if (!walletSet?.id) {
    throw new Error("Wallet set creation failed: no ID returned");
  }

  const walletResponse = await client.createWallets({
    walletSetId: walletSet.id,
    blockchains: ["ARC-TESTNET"],
    count: 1,
    accountType: "EOA",
  });

  console.log("Wallet set response:", walletSetResponse.data);
  console.log("Wallet response:", walletResponse.data);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});