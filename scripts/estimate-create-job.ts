import { createHash } from "node:crypto";
import process from "node:process";
import "dotenv/config";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

const REQUESTER_WALLET_ID = "2ae31086-6d3d-5bed-8140-8276f56f6b3f";
const PROVIDER_ADDRESS = "0xdd24fdb60ea373b032f7d570f608ff9d92236a7d";
const VERIFIER_ADDRESS = "0xa33fcc09f58b5391ef7955bb4dfd345827d3aac5";
const CONTRACT_ADDRESS = "0x635470aff03f11eb4f16cd11c4b7c4884132204c";

const ESCROW_AMOUNT = "0.01";
const VERIFICATION_WINDOW_SECONDS = 3600;
const TASK_DESCRIPTION = "Veris Arc Testnet escrow lifecycle test";

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
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const workDeadline = currentTimestamp + 3600;

  const taskHash =
    "0x" +
    createHash("sha256")
      .update(TASK_DESCRIPTION)
      .digest("hex");

  const response = await client.estimateContractExecutionFee({
    source: {
      walletId: REQUESTER_WALLET_ID,
    },
    contractAddress: CONTRACT_ADDRESS,
    abiFunctionSignature:
      "createJob(address,address,bytes32,uint64,uint64)",
    abiParameters: [
      PROVIDER_ADDRESS,
      VERIFIER_ADDRESS,
      taskHash,
      workDeadline.toString(),
      VERIFICATION_WINDOW_SECONDS.toString(),
    ],
    amount: ESCROW_AMOUNT,
  });

  console.log("Task hash:", taskHash);
  console.log("Work deadline:", workDeadline);
  console.log("Verification window:", VERIFICATION_WINDOW_SECONDS);
  console.log("Escrow amount:", ESCROW_AMOUNT);
  console.dir(response.data, { depth: null });
}

main().catch((error) => {
  console.error("Fee estimation failed:", error);
  process.exit(1);
});
