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

  const response =
    await client.createContractExecutionTransaction({
      walletId: PROVIDER_WALLET_ID,
      contractAddress: CONTRACT_ADDRESS,
      abiFunctionSignature: "submitResult(uint256,bytes32)",
      abiParameters: [JOB_ID, resultHash],
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

  console.log("Result submission initiated:", response.data);
  console.log("Job ID:", JOB_ID);
  console.log("Result description:", RESULT_DESCRIPTION);
  console.log("Result hash:", resultHash);

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
      `Result submission ended in state: ${currentState}`,
    );
  }
}

main().catch((error) => {
  console.error("Result submission failed:", error);
  process.exit(1);
});


