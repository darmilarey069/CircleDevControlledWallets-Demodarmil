import fs from "node:fs";
import process from "node:process";
import { initiateSmartContractPlatformClient } from "@circle-fin/smart-contract-platform";

const apiKey = process.env.CIRCLE_API_KEY;
const entitySecret = process.env.CIRCLE_ENTITY_SECRET;

if (!apiKey || !entitySecret) {
  throw new Error(
    "Missing CIRCLE_API_KEY or CIRCLE_ENTITY_SECRET in the .env file.",
  );
}

const client = initiateSmartContractPlatformClient({
  apiKey,
  entitySecret,
});

async function main() {
  const abiJson = fs.readFileSync(
    "artifacts/VerisEscrow.circle.abi.json",
    "utf8",
  );

  const rawBytecode = fs
    .readFileSync(
      "artifacts/VerisEscrow.bin", "utf8")
    .trim();

  const bytecode = rawBytecode.startsWith("0x")
    ? rawBytecode
    : "0x" + rawBytecode;

  const response = await client.deployContract({
    name: "VerisEscrow",
    description: "Escrow deployment test on Arc Testnet",
    blockchain: "ARC-TESTNET",
    walletId: "2ae31086-6d3d-5bed-8140-8276f56f6b3f",
    abiJson,
    bytecode,
    constructorParameters: [],
    fee: {
      type: "level",
      config: {
        feeLevel: "MEDIUM",
      },
    },
  });

  console.log("Deployment initiated:", response.data);
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exit(1);
});

