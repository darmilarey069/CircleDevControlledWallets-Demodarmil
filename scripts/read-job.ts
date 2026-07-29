import fs from "node:fs";
import { createPublicClient, http } from "viem";
import { arcTestnet } from "viem/chains";

const abi = JSON.parse(
  fs.readFileSync(
    "artifacts/VerisEscrow.circle.abi.json",
    "utf8",
  ),
);

const client = createPublicClient({
  chain: arcTestnet,
  transport: http("https://rpc.testnet.arc.network"),
});

const job = await client.readContract({
  address: "0x635470aff03f11eb4f16cd11c4b7c4884132204c",
  abi,
  functionName: "jobs",
  args: [1n],
});

console.log("Veris Job 1:");
console.dir(job, { depth: null });
