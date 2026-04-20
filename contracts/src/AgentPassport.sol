// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
/// @title AgentPassport — scoped spending sessions for autonomous agents
contract AgentPassport is UUPSUpgradeable, OwnableUpgradeable {
    uint256 private _reentrancyStatus;
    modifier nonReentrant() {
        require(_reentrancyStatus != 2, "reentrant call");
        _reentrancyStatus = 2;
        _;
        _reentrancyStatus = 1;
    }
    using SafeERC20 for IERC20;

    struct Session {
        address owner;
        address agent;
        address token;
        uint256 maxSpend;
        uint256 spent;
        uint256 expiresAt;
        bool revoked;
    }

    uint64 private _nextId;
    mapping(uint64 => Session) private _sessions;
    mapping(address => mapping(address => uint64)) public activeSession;

    event SessionOpened(uint64 indexed sessionId, address indexed owner, address indexed agent, uint256 maxSpend, uint256 expiresAt);
    event SessionRevoked(uint64 indexed sessionId);
    event Spent(uint64 indexed sessionId, address indexed to, uint256 amount);

    function initialize() public initializer {
        __Ownable_init(msg.sender);
        _nextId = 1;
        _reentrancyStatus = 1;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    function openSession(address agent, address token, uint256 maxSpend, uint256 expiresAt) external returns (uint64) {
        require(expiresAt > block.timestamp, "expiry in past");
        require(maxSpend > 0, "zero spend limit");
        uint64 existing = activeSession[msg.sender][agent];
        if (existing != 0) _sessions[existing].revoked = true;
        uint64 id = _nextId++;
        _sessions[id] = Session(msg.sender, agent, token, maxSpend, 0, expiresAt, false);
        activeSession[msg.sender][agent] = id;
        emit SessionOpened(id, msg.sender, agent, maxSpend, expiresAt);
        return id;
    }

    function spend(uint64 sessionId, address to, uint256 amount) external nonReentrant {
        Session storage s = _sessions[sessionId];
        require(msg.sender == s.agent, "not session agent");
        require(!s.revoked, "session revoked");
        require(block.timestamp <= s.expiresAt, "session expired");
        require(s.spent + amount <= s.maxSpend, "exceeds spend limit");
        s.spent += amount;
        IERC20(s.token).safeTransferFrom(s.owner, to, amount);
        emit Spent(sessionId, to, amount);
    }

    function revokeSession(uint64 sessionId) external {
        Session storage s = _sessions[sessionId];
        require(msg.sender == s.owner, "not owner");
        s.revoked = true;
        activeSession[s.owner][s.agent] = 0;
        emit SessionRevoked(sessionId);
    }

    function getSession(uint64 sessionId) external view returns (Session memory) {
        return _sessions[sessionId];
    }

    function remaining(uint64 sessionId) external view returns (uint256) {
        Session storage s = _sessions[sessionId];
        if (s.revoked || block.timestamp > s.expiresAt) return 0;
        return s.maxSpend - s.spent;
    }
}
