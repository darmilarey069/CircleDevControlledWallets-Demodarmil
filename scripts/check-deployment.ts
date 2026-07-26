import process from "node:process";
import { initiateSmartContractPlatformClient } from "@circle-fin/smart-contract-platform";

const apiKey = process.env.CIRCLE_API_KEY;
const entitySecret = process.env.CIRCLE_ENTITY_SECRET;

if (!apiKey || !entitySecret) {
  throw new Error("Missing Circle credentials in .env");
}

const client = initiateSmartContractPlatformClient({
  apiKey,
  entitySecret,
});

async function main() {
  const response = await client.getContract({
    id:"019f978e-bb91-7e0a-8f8c-b62d92f7b91e",
  });

  console.dir(response.data, { depth: null });
}

main().catch((error) => {
  console.error("Unable to retrieve deployment:", error);
  process.exit(1);
});
