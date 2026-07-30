import process from "node:process";
import "dotenv/config";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

const REQUESTER_WALLET_ID =
  "2ae31086-6d3d-5bed-8140-8276f56f6b3f";

const PROVIDER_WALLET_ID =
  "71d52713-1378-54c1-aa61-020e0d318856";

const VERIFIER_WALLET_ID =
  "42c88902-d826-56d2-acd3-5ff0db6be7cb";

const walletArg = (process.argv[2] ?? "requester").toLowerCase();

let walletId: string;

switch (walletArg) {
  case "requester":
    walletId = REQUESTER_WALLET_ID;
    break;
  case "provider":
    walletId = PROVIDER_WALLET_ID;
    break;
  case "verifier":
    walletId = VERIFIER_WALLET_ID;
    break;
  default:
    walletId = process.argv[2] ?? REQUESTER_WALLET_ID;
}

const apiKey = process.env.CIRCLE_API_KEY;
const entitySecret = process.env.CIRCLE_ENTITY_SECRET;

if (!apiKey || !entitySecret) {
  throw new Error("Missing Circle credentials in the .env file.");
}

const client = initiateDeveloperControlledWalletsClient({
  apiKey,
  entitySecret,
});

async function main() {
  const response = await client.getWalletTokenBalance({
    id: walletId,
    includeAll: true,
  });

  console.log("Wallet selector:", walletArg);
  console.log("Wallet ID:", walletId);
  console.dir(response.data?.tokenBalances ?? [], {
    depth: null,
  });
}

main().catch((error) => {
  console.error("Wallet balance read failed:", error);
  process.exit(1);
});