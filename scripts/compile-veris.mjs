import fs from "node:fs";
import path from "node:path";
import solc from "solc";

const contractName = "VerisEscrow";
const sourceFile = "VerisEscrow.sol";
const contractPath = path.resolve("contracts", sourceFile);
const source = fs.readFileSync(contractPath, "utf8");

const input = {
  language: "Solidity",
  sources: {
    [sourceFile]: {
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

const compiled = output.contracts[sourceFile][contractName];

fs.mkdirSync("artifacts", { recursive: true });

const abiPath = "artifacts/" + contractName + ".abi.json";
const bytecodePath = "artifacts/" + contractName + ".bin";

fs.writeFileSync(
  abiPath,
  JSON.stringify(compiled.abi, null, 2),
);

fs.writeFileSync(
  bytecodePath,
  compiled.evm.bytecode.object,
);

console.log("VerisEscrow compiled successfully.");
console.log("EVM target: paris");
console.log("ABI: " + abiPath);
console.log("Bytecode: " + bytecodePath);
