import fs from "node:fs";
import process from "node:process";
import { createPublicClient, http } from "viem";
import { arcTestnet } from "viem/chains";

const jobIdArg = process.argv[2];

if (!jobIdArg || !/^\d+$/.test(jobIdArg)) {
  throw new Error(
    "Provide a numeric job ID, for example: npx tsx .\\scripts\\read-job.ts 2",
  );
}

const jobId = BigInt(jobIdArg);

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
  args: [jobId],
});

console.log("Veris Job " + jobIdArg + ":");
console.dir(job, { depth: null });
