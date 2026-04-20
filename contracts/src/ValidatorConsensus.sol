// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
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
///   1. Validators stake USDC via stake().
///   2. When a job is submitted, the commerce contract's evaluator should be
///      set to this contract's address so it can call complete()/reject().
///   3. Anyone calls requestValidation(jobId) to open a vote round.
///   4. Staked validators call vote(jobId, approve).
///   5. Once 2/3 of staked validators have voted, consensus is reached:
///      - Majority approve → commerce.complete(jobId)
///      - Majority reject  → commerce.reject(jobId)
///   6. Validators who voted with the majority share the validator fee.
contract ValidatorConsensus is UUPSUpgradeable, OwnableUpgradeable {
    using SafeERC20 for IERC20;

    IERC20 public token;
    IAgenticCommerce public commerce;

    uint256 public minStake;
    uint256 public validatorFeeBps; // share of job budget paid to validators (e.g. 50 = 0.5%)

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
        address[] approvers; // track majority voters for reward split
    }

    mapping(uint64 => Round) private _rounds;

    event ValidationRequested(uint64 indexed jobId);
    event Voted(uint64 indexed jobId, address indexed validator, bool approve);
    event ConsensusReached(uint64 indexed jobId, bool approved);

    function initialize(address _token, address _commerce, uint256 _minStake) public initializer {
        __Ownable_init(msg.sender);
        token = IERC20(_token);
        commerce = IAgenticCommerce(_commerce);
        minStake = _minStake;
        validatorFeeBps = 50; // 0.5% of job budget
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    // ── Staking ───────────────────────────────────────────────────────────────

    function stake(uint256 amount) external {
        require(amount >= minStake, "below min stake");
        token.safeTransferFrom(msg.sender, address(this), amount);
        if (staked[msg.sender] == 0) validatorList.push(msg.sender);
        staked[msg.sender] += amount;
        emit Staked(msg.sender, amount);
    }

    function unstake() external {
        uint256 amount = staked[msg.sender];
        require(amount > 0, "nothing staked");
        staked[msg.sender] = 0;
        // remove from list
        for (uint256 i = 0; i < validatorList.length; i++) {
            if (validatorList[i] == msg.sender) {
                validatorList[i] = validatorList[validatorList.length - 1];
                validatorList.pop();
                break;
            }
        }
        token.safeTransfer(msg.sender, amount);
        emit Unstaked(msg.sender, amount);
    }

    function validatorCount() external view returns (uint256) {
        return validatorList.length;
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
        uint256 threshold = (total * 2) / 3 + 1; // 2/3 majority

        if (r.approvals >= threshold) {
            r.open = false;
            emit ConsensusReached(jobId, true);
            _distributeReward(jobId, r.approvers);
            commerce.complete(jobId);
        } else if (r.rejections >= threshold) {
            r.open = false;
            emit ConsensusReached(jobId, false);
            commerce.reject(jobId);
        }
    }

    /// @dev Pays majority voters from the job budget via a small fee.
    ///      Requires the commerce contract to have approved this contract to pull funds,
    ///      OR we simply transfer from this contract's balance if pre-funded.
    ///      For simplicity: validators are rewarded from a pre-deposited reward pool.
    function _distributeReward(uint64, address[] storage approvers) internal {
        if (approvers.length == 0 || address(token) == address(0)) return;
        uint256 pool = token.balanceOf(address(this));
        // subtract staked amounts to only use reward pool
        uint256 totalStakedHere = 0;
        for (uint256 i = 0; i < validatorList.length; i++) totalStakedHere += staked[validatorList[i]];
        uint256 rewardPool = pool > totalStakedHere ? pool - totalStakedHere : 0;
        if (rewardPool == 0) return;

        uint256 share = rewardPool / approvers.length;
        for (uint256 i = 0; i < approvers.length; i++) {
            token.safeTransfer(approvers[i], share);
        }
    }

    function depositRewards(uint256 amount) external {
        token.safeTransferFrom(msg.sender, address(this), amount);
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
}
