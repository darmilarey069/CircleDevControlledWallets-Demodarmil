// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title VerisEscrow
/// @notice Escrow settlement for work performed between autonomous agents.
contract VerisEscrow {
    enum JobStatus {
        NONE,
        FUNDED,
        SUBMITTED,
        RELEASED,
        REFUNDED
    }

    struct Job {
        address requester;
        address provider;
        address verifier;
        uint256 amount;
        bytes32 taskHash;
        bytes32 resultHash;
        uint64 workDeadline;
        uint64 verificationDeadline;
        uint64 verificationWindow;
        JobStatus status;
    }

    uint256 public nextJobId = 1;

    mapping(uint256 => Job) public jobs;

    bool private entered;

    event JobCreated(
        uint256 indexed jobId,
        address indexed requester,
        address indexed provider,
        address verifier,
        uint256 amount,
        bytes32 taskHash,
        uint64 workDeadline,
        uint64 verificationWindow
    );

    event ResultSubmitted(
        uint256 indexed jobId,
        bytes32 indexed resultHash,
        uint64 verificationDeadline
    );

    event PaymentReleased(
        uint256 indexed jobId,
        address indexed provider,
        uint256 amount
    );

    event PaymentRefunded(
        uint256 indexed jobId,
        address indexed requester,
        uint256 amount
    );

    error InvalidAddress();
    error InvalidAmount();
    error InvalidHash();
    error InvalidDeadline();
    error InvalidVerificationWindow();
    error RolesMustBeDistinct();
    error JobNotFound();
    error InvalidJobStatus();
    error NotRequester();
    error NotProvider();
    error NotVerifier();
    error WorkDeadlinePassed();
    error WorkDeadlineNotReached();
    error VerificationDeadlinePassed();
    error VerificationDeadlineNotReached();
    error TransferFailed();
    error Reentrancy();
    error DirectPaymentsNotAllowed();

    modifier nonReentrant() {
        if (entered) revert Reentrancy();

        entered = true;
        _;
        entered = false;
    }

    modifier jobExists(uint256 jobId) {
        if (jobs[jobId].status == JobStatus.NONE) {
            revert JobNotFound();
        }

        _;
    }

    /// @notice Creates and funds a new Veris job.
    function createJob(
        address provider,
        address verifier,
        bytes32 taskHash,
        uint64 workDeadline,
        uint64 verificationWindow
    ) external payable returns (uint256 jobId) {
        if (provider == address(0) || verifier == address(0)) {
            revert InvalidAddress();
        }

        if (
            provider == msg.sender ||
            verifier == msg.sender ||
            provider == verifier
        ) {
            revert RolesMustBeDistinct();
        }

        if (msg.value == 0) revert InvalidAmount();
        if (taskHash == bytes32(0)) revert InvalidHash();
        if (workDeadline <= block.timestamp) revert InvalidDeadline();
        if (verificationWindow == 0) revert InvalidVerificationWindow();

        jobId = nextJobId;
        nextJobId++;

        jobs[jobId] = Job({
            requester: msg.sender,
            provider: provider,
            verifier: verifier,
            amount: msg.value,
            taskHash: taskHash,
            resultHash: bytes32(0),
            workDeadline: workDeadline,
            verificationDeadline: 0,
            verificationWindow: verificationWindow,
            status: JobStatus.FUNDED
        });

        emit JobCreated(
            jobId,
            msg.sender,
            provider,
            verifier,
            msg.value,
            taskHash,
            workDeadline,
            verificationWindow
        );
    }

    /// @notice Called by the provider after completing the work.
    function submitResult(
        uint256 jobId,
        bytes32 resultHash
    ) external jobExists(jobId) {
        Job storage job = jobs[jobId];
if (msg.sender != job.provider) revert NotProvider();
        if (job.status != JobStatus.FUNDED) revert InvalidJobStatus();
        if (block.timestamp > job.workDeadline) revert WorkDeadlinePassed();
        if (resultHash == bytes32(0)) revert InvalidHash();

        uint64 verificationDeadline =
            uint64(block.timestamp) + job.verificationWindow;

        job.resultHash = resultHash;
        job.verificationDeadline = verificationDeadline;
        job.status = JobStatus.SUBMITTED;

        emit ResultSubmitted(
            jobId,
            resultHash,
            verificationDeadline
        );
    }

    /// @notice Approves valid work and releases payment to the provider.
    function approveResult(
        uint256 jobId
    ) external jobExists(jobId) nonReentrant {
        Job storage job = jobs[jobId];

        if (msg.sender != job.verifier) revert NotVerifier();
        if (job.status != JobStatus.SUBMITTED) revert InvalidJobStatus();

        if (block.timestamp > job.verificationDeadline) {
            revert VerificationDeadlinePassed();
        }

        job.status = JobStatus.RELEASED;

        uint256 amount = job.amount;
        job.amount = 0;

        _transferNative(job.provider, amount);

        emit PaymentReleased(jobId, job.provider, amount);
    }

    /// @notice Rejects invalid work and refunds the requester.
    function rejectResult(
        uint256 jobId
    ) external jobExists(jobId) nonReentrant {
        Job storage job = jobs[jobId];

        if (msg.sender != job.verifier) revert NotVerifier();
        if (job.status != JobStatus.SUBMITTED) revert InvalidJobStatus();

        if (block.timestamp > job.verificationDeadline) {
            revert VerificationDeadlinePassed();
        }

        _refund(jobId, job);
    }

    /// @notice Refunds a job when the provider misses the work deadline.
    function refundExpiredJob(
        uint256 jobId
    ) external jobExists(jobId) nonReentrant {
        Job storage job = jobs[jobId];

        if (msg.sender != job.requester) revert NotRequester();
        if (job.status != JobStatus.FUNDED) revert InvalidJobStatus();

        if (block.timestamp <= job.workDeadline) {
            revert WorkDeadlineNotReached();
        }

        _refund(jobId, job);
    }

    /// @notice Refunds the requester when the verifier misses the review deadline.
    function refundAfterVerificationTimeout(
        uint256 jobId
    ) external jobExists(jobId) nonReentrant {
        Job storage job = jobs[jobId];

        if (msg.sender != job.requester) revert NotRequester();
        if (job.status != JobStatus.SUBMITTED) revert InvalidJobStatus();

        if (block.timestamp <= job.verificationDeadline) {
            revert VerificationDeadlineNotReached();
        }

        _refund(jobId, job);
    }

    function _refund(uint256 jobId, Job storage job) private {
        job.status = JobStatus.REFUNDED;

        uint256 amount = job.amount;
        job.amount = 0;

        _transferNative(job.requester, amount);

        emit PaymentRefunded(jobId, job.requester, amount);
    }

    function _transferNative(address recipient, uint256 amount) private {
        (bool success, ) = payable(recipient).call{value: amount}("");

        if (!success) revert TransferFailed();
    }

    receive() external payable {
        revert DirectPaymentsNotAllowed();
    }

    fallback() external payable {
        revert DirectPaymentsNotAllowed();
    }
}
