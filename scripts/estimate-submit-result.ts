import { createHash } from "node:crypto";
import process from "node:process";
import "dotenv/config";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

const PROVIDER_WALLET_ID =
  "71d52713-1378-54c1-aa61-020e0d318856";

const CONTRACT_ADDRESS =
  "0x635470aff03f11eb4f16cd11c4b7c4884132204c";

const JOB_ID = "1";
const RESULT_DESCRIPTION =
  "Completed result for Veris Arc Testnet escrow lifecycle test";

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
  const resultHash =
    "0x" +
    createHash("sha256")
      .update(RESULT_DESCRIPTION)
      .digest("hex");

  const response = await client.estimateContractExecutionFee({
    source: {
      walletId: PROVIDER_WALLET_ID,
    },
    contractAddress: CONTRACT_ADDRESS,
    abiFunctionSignature: "submitResult(uint256,bytes32)",
    abiParameters: [JOB_ID, resultHash],
  });

  console.log("Job ID:", JOB_ID);
  console.log("Result description:", RESULT_DESCRIPTION);
  console.log("Result hash:", resultHash);
  console.dir(response.data, { depth: null });
}

main().catch((error) => {
  console.error("Fee estimation failed:", error);
  process.exit(1);
});
