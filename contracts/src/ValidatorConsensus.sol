// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

interface IAgenticCommerce {
    function complete(uint64 id) external;
    function reject(uint64 id) external;
    function getJob(uint64 id) external view returns (
        uint64, address, address, address, address, uint256, uint8, string memory, string memory
    );
}

/// @title ValidatorConsensus — staked validator agents vote on job deliverables.
///
/// Flow:
///   1. Validators stake native KITE via stake() (payable).
///   2. When a job is submitted, the commerce contract's evaluator should be
///      set to this contract's address so it can call complete()/reject().
///   3. Anyone calls requestValidation(jobId) to open a vote round.
///   4. Staked validators call vote(jobId, approve).
///   5. Once 2/3 of staked validators have voted, consensus is reached:
///      - Majority approve → commerce.complete(jobId)
///      - Majority reject  → commerce.reject(jobId)
///   6. Validators who voted with the majority share the native KITE reward pool.
contract ValidatorConsensus is UUPSUpgradeable, OwnableUpgradeable {
    IAgenticCommerce public commerce;

    uint256 public minStake;
    uint256 public rewardPool; // native KITE deposited as rewards

    // ── Staking ───────────────────────────────────────────────────────────────

    address[] public validatorList;
    mapping(address => uint256) public staked;

    event Staked(address indexed validator, uint256 amount);
    event Unstaked(address indexed validator, uint256 amount);

    // ── Voting ────────────────────────────────────────────────────────────────

    struct Round {
        bool open;
        uint256 approvals;
        uint256 rejections;
        mapping(address => bool) voted;
        address[] approvers;
    }

    mapping(uint64 => Round) private _rounds;

    event ValidationRequested(uint64 indexed jobId);
    event Voted(uint64 indexed jobId, address indexed validator, bool approve);
    event ConsensusReached(uint64 indexed jobId, bool approved);

    function initialize(address _commerce, uint256 _minStake) public initializer {
        __Ownable_init(msg.sender);
        commerce = IAgenticCommerce(_commerce);
        minStake = _minStake;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    // ── Staking (native KITE) ─────────────────────────────────────────────────

    function stake() external payable {
        require(msg.value >= minStake, "below min stake");
        if (staked[msg.sender] == 0) validatorList.push(msg.sender);
        staked[msg.sender] += msg.value;
        emit Staked(msg.sender, msg.value);
    }

    function unstake() external {
        uint256 amount = staked[msg.sender];
        require(amount > 0, "nothing staked");
        staked[msg.sender] = 0;
        for (uint256 i = 0; i < validatorList.length; i++) {
            if (validatorList[i] == msg.sender) {
                validatorList[i] = validatorList[validatorList.length - 1];
                validatorList.pop();
                break;
            }
        }
        (bool ok,) = msg.sender.call{value: amount}("");
        require(ok, "transfer failed");
        emit Unstaked(msg.sender, amount);
    }

    function validatorCount() external view returns (uint256) {
        return validatorList.length;
    }

    // ── Rewards (native KITE) ─────────────────────────────────────────────────

    function depositRewards() external payable {
        rewardPool += msg.value;
    }

    // ── Voting ────────────────────────────────────────────────────────────────

    function requestValidation(uint64 jobId) external {
        require(!_rounds[jobId].open, "round already open");
        require(validatorList.length > 0, "no validators staked");
        _rounds[jobId].open = true;
        emit ValidationRequested(jobId);
    }

    function vote(uint64 jobId, bool approve) external {
        Round storage r = _rounds[jobId];
        require(r.open, "no open round");
        require(staked[msg.sender] >= minStake, "not staked");
        require(!r.voted[msg.sender], "already voted");

        r.voted[msg.sender] = true;
        if (approve) {
            r.approvals++;
            r.approvers.push(msg.sender);
        } else {
            r.rejections++;
        }

        emit Voted(jobId, msg.sender, approve);
        _checkConsensus(jobId);
    }

    function _checkConsensus(uint64 jobId) internal {
        Round storage r = _rounds[jobId];
        uint256 total = validatorList.length;
        uint256 threshold = (total * 2) / 3 + 1;

        if (r.approvals >= threshold) {
            r.open = false;
            emit ConsensusReached(jobId, true);
            _distributeReward(r.approvers);
            commerce.complete(jobId);
        } else if (r.rejections >= threshold) {
            r.open = false;
            emit ConsensusReached(jobId, false);
            commerce.reject(jobId);
        }
    }

    function _distributeReward(address[] storage approvers) internal {
        if (approvers.length == 0 || rewardPool == 0) return;
        uint256 share = rewardPool / approvers.length;
        rewardPool = 0;
        for (uint256 i = 0; i < approvers.length; i++) {
            (bool ok,) = approvers[i].call{value: share}("");
            if (!ok) rewardPool += share; // refund on failure
        }
    }

    // ── View ──────────────────────────────────────────────────────────────────

    function roundStatus(uint64 jobId) external view returns (bool open, uint256 approvals, uint256 rejections) {
        Round storage r = _rounds[jobId];
        return (r.open, r.approvals, r.rejections);
    }

    function hasVoted(uint64 jobId, address validator) external view returns (bool) {
        return _rounds[jobId].voted[validator];
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    function setMinStake(uint256 _minStake) external onlyOwner { minStake = _minStake; }
    function setCommerce(address _commerce) external onlyOwner { commerce = IAgenticCommerce(_commerce); }

    receive() external payable { rewardPool += msg.value; }
}
