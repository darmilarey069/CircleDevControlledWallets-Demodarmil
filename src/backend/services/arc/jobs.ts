import { formatUnits } from "viem";
import {
  arcClient,
  verisAbi,
  verisContractAddress,
} from "./client.js";

const jobStatuses = {
  0: "NONE",
  1: "FUNDED",
  2: "SUBMITTED",
  3: "RELEASED",
  4: "REFUNDED",
} as const;

export async function readNextJobId() {
  const nextJobId = await arcClient.readContract({
    address: verisContractAddress,
    abi: verisAbi,
    functionName: "nextJobId",
  });

  return {
    nextJobId: nextJobId.toString(),
  };
}

export async function readJob(jobId: bigint) {
  const job = await arcClient.readContract({
    address: verisContractAddress,
    abi: verisAbi,
    functionName: "jobs",
    args: [jobId],
  });

  const [
    requester,
    provider,
    verifier,
    amount,
    taskHash,
    resultHash,
    workDeadline,
    verificationDeadline,
    verificationWindow,
    numericStatus,
  ] = job;

  const statusCode = Number(numericStatus);

  if (statusCode === 0) {
    return null;
  }

  return {
    jobId: jobId.toString(),
    requester,
    provider,
    verifier,
    amountAtomic: amount.toString(),
    amount: formatUnits(amount, 18),
    taskHash,
    resultHash,
    workDeadline: workDeadline.toString(),
    verificationDeadline: verificationDeadline.toString(),
    verificationWindow: verificationWindow.toString(),
    statusCode,
    status:
      jobStatuses[statusCode as keyof typeof jobStatuses] ??
      "UNKNOWN",
    contractAddress: verisContractAddress,
    explorerUrl:
      "https://testnet.arcscan.app/address/" +
      verisContractAddress,
  };
}
