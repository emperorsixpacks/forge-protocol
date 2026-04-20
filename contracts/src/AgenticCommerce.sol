// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
/// @title AgenticCommerce — escrow job marketplace (MARC / ERC-8183)
contract AgenticCommerce is UUPSUpgradeable, OwnableUpgradeable {
    uint256 private _reentrancyStatus; // 1 = not entered, 2 = entered
    modifier nonReentrant() {
        require(_reentrancyStatus != 2, "reentrant call");
        _reentrancyStatus = 2;
        _;
        _reentrancyStatus = 1;
    }
    using SafeERC20 for IERC20;

    enum JobStatus { Funded, Submitted, Completed, Rejected, Cancelled }

    struct Job {
        uint64 id;
        address client;
        address provider;
        address evaluator;
        address token;
        uint256 budget;
        JobStatus status;
        string description;
        string deliverable;
    }

    uint16 public constant MAX_FEE_BPS = 500;

    address public treasury;
    uint16 public feeBps;
    uint64 private _nextId;
    mapping(uint64 => Job) private _jobs;

    event JobCreated(address indexed client, uint64 jobId, uint256 budget);
    event JobSubmitted(address indexed provider, uint64 jobId);
    event JobCompleted(address indexed evaluator, uint64 jobId, uint256 payout, uint256 fee);
    event JobRejected(address indexed evaluator, uint64 jobId);
    event JobCancelled(address indexed client, uint64 jobId);

    function initialize(address _treasury) public initializer {
        __Ownable_init(msg.sender);
        treasury = _treasury;
        _reentrancyStatus = 1;
        feeBps = 100;
        _nextId = 1;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    function createJob(address provider, address evaluator, address token, uint256 budget, string calldata description) external nonReentrant returns (uint64) {
        require(budget > 0, "budget must be positive");
        IERC20(token).safeTransferFrom(msg.sender, address(this), budget);
        uint64 id = _nextId++;
        _jobs[id] = Job(id, msg.sender, provider, evaluator, token, budget, JobStatus.Funded, description, "");
        emit JobCreated(msg.sender, id, budget);
        return id;
    }

    function submit(uint64 id, string calldata deliverable) external {
        Job storage job = _jobs[id];
        require(msg.sender == job.provider, "not provider");
        require(job.status == JobStatus.Funded, "invalid status");
        job.status = JobStatus.Submitted;
        job.deliverable = deliverable;
        emit JobSubmitted(msg.sender, id);
    }

    function complete(uint64 id) external nonReentrant {
        Job storage job = _jobs[id];
        require(msg.sender == job.evaluator, "not evaluator");
        require(job.status == JobStatus.Submitted, "invalid status");
        uint256 fee = (job.budget * feeBps) / 10_000;
        uint256 payout = job.budget - fee;
        job.status = JobStatus.Completed;
        IERC20(job.token).safeTransfer(job.provider, payout);
        if (fee > 0) IERC20(job.token).safeTransfer(treasury, fee);
        emit JobCompleted(msg.sender, id, payout, fee);
    }

    function reject(uint64 id) external nonReentrant {
        Job storage job = _jobs[id];
        require(msg.sender == job.evaluator, "not evaluator");
        require(job.status == JobStatus.Submitted, "invalid status");
        job.status = JobStatus.Rejected;
        IERC20(job.token).safeTransfer(job.client, job.budget);
        emit JobRejected(msg.sender, id);
    }

    function cancel(uint64 id) external nonReentrant {
        Job storage job = _jobs[id];
        require(msg.sender == job.client, "not client");
        require(job.status == JobStatus.Funded, "invalid status");
        job.status = JobStatus.Cancelled;
        IERC20(job.token).safeTransfer(job.client, job.budget);
        emit JobCancelled(msg.sender, id);
    }

    function getJob(uint64 id) external view returns (Job memory) {
        require(_jobs[id].client != address(0), "job not found");
        return _jobs[id];
    }

    function setTreasury(address newTreasury) external onlyOwner {
        treasury = newTreasury;
    }

    function setFeeBps(uint16 newBps) external onlyOwner {
        require(newBps <= MAX_FEE_BPS, "fee too high");
        feeBps = newBps;
    }
}
