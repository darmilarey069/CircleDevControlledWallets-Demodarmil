# Veris MVP Specification

## Purpose

Veris is an on-chain escrow system for AI-agent work.

A requester agent locks payment.
A provider agent completes the task.
A verifier agent checks the result.
The contract releases or refunds the payment automatically.

## Roles

### Requester

* Creates the job
* Deposits payment
* Defines the provider, verifier, task hash, and deadline

### Provider

* Completes the requested work
* Submits a cryptographic hash of the result

### Verifier

* Approves or rejects the submitted result

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

* createJob(...)
* submitResult(...)
* approveResult(...)
* rejectResult(...)
* refundExpiredJob(...)

## On-chain evidence

Each job stores:

* requester address
* provider address
* verifier address
* payment amount
* task hash
* result hash
* deadline
* job status

## MVP limitations

* One provider per job
* One trusted verifier per job
* Full task content and results remain off-chain
* Only cryptographic hashes and payment data are stored on-chain
* No partial payments
* No dispute arbitration
* Arc Testnet only


## Validated Arc Testnet milestones


### Job 1: approval and provider payment

On 30 July 2026, Job 1 completed the full Veris escrow approval path on Arc Testnet.

- The requester created and funded Job 1 with 0.01 USDC
- The provider submitted a cryptographic hash of the completed result
- The assigned verifier approved the submission
- The contract released the escrow payment to the provider
- The stored escrow amount changed from 0.01 USDC to zero
- The job status changed from FUNDED to SUBMITTED and finally RELEASED
- The provider's wallet balance increased after settlement

#### Job 1 transactions

- Job creation: 0xcf74fa1c00785d062e05c6abb35efd920f76f0e1e0739418af6133995f2f9777
- Result submission: 0xabb88a71487c45b52cf02415498d3b6b5d23336c94d77dff08d4be157168e576
- Result approval and payment release: 0x1aa08fe4f4bf29f0d3299ee94c575467b3a73eee380c7f8167c0a6d40e79aaa4

### Job 2: verifier rejection and requester refund

On 30 July 2026, Job 2 completed the verifier-rejection refund path on Arc Testnet.

- The requester created and funded Job 2 with 0.01 USDC
- The provider submitted a cryptographic hash of the completed result
- The assigned verifier rejected the submission
- The contract refunded the escrow payment to the requester
- The stored escrow amount changed from 0.01 USDC to zero
- The job status changed from FUNDED to SUBMITTED and finally REFUNDED
- The verifier paid a network fee of 0.0019562676 USDC for the rejection transaction

#### Job 2 transactions

- Job creation: 0x6ff5de1a3c5253bb24a6e3b75c7ddecc5574e81d100cdd0e92d00946cb452d7d
- Result submission: 0x201cbc2b7c886a1a87c4ce88cd77c7085d2f50a291eb6034480fac87cc81eb42
- Result rejection and requester refund: 0xb2f75b191b89831642c607e4b1a1d21ee1e4b135dcdfdffcf33661b6ec8f30da

### Deployment

- Contract address: 0x635470aff03f11eb4f16cd11c4b7c4884132204c

These tests validate both the approval-and-release path and the verifier-rejection refund path. The missed-work-deadline refund, verification-timeout refund, backend automation, database integration and user-facing interface remain to be tested or implemented.
