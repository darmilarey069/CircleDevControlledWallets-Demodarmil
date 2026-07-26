import fs from "node:fs";
import path from "node:path";
import solc from "solc";

const contractPath = path.resolve("contracts/ArcFoundationTest.sol");
const source = fs.readFileSync(contractPath, "utf8");

const input = {
  language: "Solidity",
  sources: {
    "ArcFoundationTest.sol": {
      content: source,
    },
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
    evmVersion: "paris",
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode.object"],
      },
    },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));
const messages = output.errors ?? [];

for (const message of messages) {
  console.log(message.formattedMessage);
}

if (messages.some((message) => message.severity === "error")) {
  process.exit(1);
}

const compiled =
  output.contracts["ArcFoundationTest.sol"]["ArcFoundationTest"];

fs.mkdirSync("artifacts", { recursive: true });

fs.writeFileSync(
  "artifacts/ArcFoundationTest.abi.json",
  JSON.stringify(compiled.abi, null, 2),
);

fs.writeFileSync(
  "artifacts/ArcFoundationTest.bin",
  compiled.evm.bytecode.object,
);

console.log("Compiled successfully with EVM target: paris");
console.log("ABI: artifacts/ArcFoundationTest.abi.json");
console.log("Bytecode: artifacts/ArcFoundationTest.bin");
