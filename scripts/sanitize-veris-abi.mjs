import fs from "node:fs";

const inputPath = "artifacts/VerisEscrow.abi.json";
const outputPath = "artifacts/VerisEscrow.circle.abi.json";

const abi = JSON.parse(fs.readFileSync(inputPath, "utf8"));

function removeInternalType(value) {
  if (Array.isArray(value)) {
    return value.map(removeInternalType);
  }

  if (value && typeof value === "object") {
    const cleaned = {};

    for (const [key, childValue] of Object.entries(value)) {
      if (key !== "internalType") {
        cleaned[key] = removeInternalType(childValue);
      }
    }

    return cleaned;
  }

  return value;
}

const supportedEntries = abi.filter(
  (entry) => entry.type === "function" || entry.type === "event",
);

const sanitisedAbi = removeInternalType(supportedEntries);

fs.writeFileSync(
  outputPath,
  JSON.stringify(sanitisedAbi),
);

console.log("Circle ABI sanitised successfully.");
console.log("Entries:", sanitisedAbi.length);
console.log("Saved to:", outputPath);
