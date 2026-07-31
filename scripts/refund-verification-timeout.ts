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
    "Provide a numeric job ID, for example: npx tsx .\\scripts\\refund-verification-timeout.ts 4",
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
  const response =
    await client.createContractExecutionTransaction({
      walletId: REQUESTER_WALLET_ID,
      contractAddress: CONTRACT_ADDRESS,
      abiFunctionSignature:
        "refundAfterVerificationTimeout(uint256)",
      abiParameters: [jobIdArg],
      fee: {
        type: "level",
        config: {
          feeLevel: "MEDIUM",
        },
      },
    });

  const transactionId = response.data?.id;
  let currentState = response.data?.state ?? "";

  if (!transactionId) {
    throw new Error("No transaction ID returned.");
  }

  console.log(
    "Verification-timeout refund initiated:",
    response.data,
  );
  console.log("Job ID:", jobIdArg);

  const terminalStates = new Set([
    "COMPLETE",
    "FAILED",
    "CANCELLED",
    "DENIED",
  ]);

  while (!terminalStates.has(currentState)) {
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const pollResponse = await client.getTransaction({
      id: transactionId,
    });

    const transaction = pollResponse.data?.transaction;
    currentState = transaction?.state ?? "";

    console.log("Transaction state:", currentState);

    if (terminalStates.has(currentState)) {
      console.dir(transaction, { depth: null });
    }
  }

  if (currentState !== "COMPLETE") {
    throw new Error(
      "Verification-timeout refund ended in state: " +
        currentState,
    );
  }
}

main().catch((error) => {
  console.error(
    "Verification-timeout refund failed:",
    error,
  );
  process.exit(1);
});