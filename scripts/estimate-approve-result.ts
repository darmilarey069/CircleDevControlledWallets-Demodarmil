import process from "node:process";
import "dotenv/config";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

const VERIFIER_WALLET_ID =
  "42c88902-d826-56d2-acd3-5ff0db6be7cb";

const CONTRACT_ADDRESS =
  "0x635470aff03f11eb4f16cd11c4b7c4884132204c";

const JOB_ID = "1";

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
  const response = await client.estimateContractExecutionFee({
    source: {
      walletId: VERIFIER_WALLET_ID,
    },
    contractAddress: CONTRACT_ADDRESS,
    abiFunctionSignature: "approveResult(uint256)",
    abiParameters: [JOB_ID],
  });

  console.log("Job ID:", JOB_ID);
  console.dir(response.data, { depth: null });
}

main().catch((error) => {
  console.error("Approval fee estimation failed:", error);
  process.exit(1);
});
