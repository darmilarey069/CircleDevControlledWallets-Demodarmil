import {
  createPublicClient,
  getAddress,
  http,
  parseAbi,
} from "viem";
import { arcTestnet } from "viem/chains";
import { env } from "../../config/env.js";

export const verisContractAddress = getAddress(
  env.VERIS_CONTRACT_ADDRESS,
);

export const verisAbi = parseAbi([
  "function nextJobId() view returns (uint256)",
  "function jobs(uint256 jobId) view returns (address requester, address provider, address verifier, uint256 amount, bytes32 taskHash, bytes32 resultHash, uint64 workDeadline, uint64 verificationDeadline, uint64 verificationWindow, uint8 status)",
]);

export const arcClient = createPublicClient({
  chain: arcTestnet,
  transport: http(env.ARC_RPC_URL, {
    retryCount: 3,
    retryDelay: 1_000,
    timeout: 15_000,
  }),
});
