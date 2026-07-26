import fs from "node:fs";
import process from "node:process";

const apiKey = process.env.CIRCLE_API_KEY;

if (!apiKey) {
  throw new Error("Missing CIRCLE_API_KEY in .env");
}

const rawBytecode = fs
  .readFileSync("artifacts/VerisEscrow.bin", "utf8")
  .trim();

const bytecode = rawBytecode.startsWith("0x")
  ? rawBytecode
  : "0x" + rawBytecode;

const response = await fetch(
  "https://api.circle.com/v1/w3s/contracts/deploy/estimateFee",
  {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      walletId: "2ae31086-6d3d-5bed-8140-8276f56f6b3f",
      bytecode,
      constructorSignature: "constructor()",
      constructorParameters: [],
    }),
  },
);

console.log("HTTP status:", response.status);
console.log(await response.text());
