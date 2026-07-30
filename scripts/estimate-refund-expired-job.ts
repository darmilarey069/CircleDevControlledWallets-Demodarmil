import process from "node:process";
import "dotenv/config";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

const REQUESTER_WALLET_ID =
  "2ae31086-6d3d-5bed-8140-8276f56f6b3f";

const CONTRACT_ADDRESS =
  "0x635470aff03f11eb4f16cd11c4b7c4884132204c";

const jobIdArg = process.argv[2];

if (!jobIdArg || !/^\d+$/.test(jobIdArg)) {
  throw new Error(
    "Provide a numeric job ID, for example: npx tsx .\\scripts\\estimate-refund-expired-job.ts 3",
  );
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
  const response = await client.estimateContractExecutionFee({
    source: {
      walletId: REQUESTER_WALLET_ID,
    },
    contractAddress: CONTRACT_ADDRESS,
    abiFunctionSignature: "refundExpiredJob(uint256)",
    abiParameters: [jobIdArg],
  });

  console.log("Job ID:", jobIdArg);
  console.dir(response.data, { depth: null });
}

main().catch((error) => {
  console.error("Expired-job refund fee estimation failed:", error);
  process.exit(1);
});