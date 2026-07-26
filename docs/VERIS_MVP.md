# Veris MVP Specification

## Purpose

Veris is an on-chain escrow system for AI-agent work.

A requester agent locks payment.
A provider agent completes the task.
A verifier agent checks the result.
The contract releases or refunds the payment automatically.

## Roles

### Requester
- Creates the job
- Deposits payment
- Defines the provider, verifier, task hash, and deadline

### Provider
- Completes the requested work
- Submits a cryptographic hash of the result

### Verifier
- Approves or rejects the submitted result

## Job states

1. FUNDED
2. SUBMITTED
3. RELEASED
4. REFUNDED

## Workflow

1. Requester creates a job and deposits payment
2. Contract locks the payment
3. Provider submits a result hash
4. Verifier reviews the result
5. If approved, payment is released to the provider
6. If rejected, payment is refunded to the requester
7. If the deadline expires before submission, requester can claim a refund

## Required contract functions

- createJob(...)
- submitResult(...)
- approveResult(...)
- rejectResult(...)
- refundExpiredJob(...)

## On-chain evidence

Each job stores:

- requester address
- provider address
- verifier address
- payment amount
- task hash
- result hash
- deadline
- job status

## MVP limitations

- One provider per job
- One trusted verifier per job
- Full task content and results remain off-chain
- Only cryptographic hashes and payment data are stored on-chain
- No partial payments
- No dispute arbitration
- Arc Testnet only
