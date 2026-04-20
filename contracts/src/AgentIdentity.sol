// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/// @title AgentIdentity — ERC-8004 compliant identity, reputation, and validation registries
contract AgentIdentity is ERC721URIStorageUpgradeable, UUPSUpgradeable, OwnableUpgradeable {
    // ─── Identity Registry ───────────────────────────────────────────────────

    uint256 private _nextId;
    mapping(uint256 => address) private _agentWallet;
    mapping(uint256 => mapping(string => bytes)) private _metadata;

    event AgentRegistered(address indexed owner, uint256 agentId, string agentURI);
    event AgentWalletSet(uint256 indexed agentId, address wallet);
    event MetadataSet(uint256 indexed agentId, string key);

    function initialize() public initializer {
        __ERC721_init("MARC Agent", "MARC");
        __ERC721URIStorage_init();
        __Ownable_init(msg.sender);
        _nextId = 1;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    function register(string calldata agentURI) external returns (uint256) {
        uint256 id = _nextId++;
        _mint(msg.sender, id);
        _setTokenURI(id, agentURI);
        emit AgentRegistered(msg.sender, id, agentURI);
        return id;
    }

    function setAgentURI(uint256 agentId, string calldata newURI) external {
        require(ownerOf(agentId) == msg.sender, "not owner");
        _setTokenURI(agentId, newURI);
    }

    function setMetadata(uint256 agentId, string calldata key, bytes calldata value) external {
        require(ownerOf(agentId) == msg.sender, "not owner");
        _metadata[agentId][key] = value;
        emit MetadataSet(agentId, key);
    }

    function getMetadata(uint256 agentId, string calldata key) external view returns (bytes memory) {
        return _metadata[agentId][key];
    }

    function setAgentWallet(uint256 agentId, address wallet) external {
        require(ownerOf(agentId) == msg.sender, "not owner");
        _agentWallet[agentId] = wallet;
        emit AgentWalletSet(agentId, wallet);
    }

    function unsetAgentWallet(uint256 agentId) external {
        require(ownerOf(agentId) == msg.sender, "not owner");
        delete _agentWallet[agentId];
        emit AgentWalletSet(agentId, address(0));
    }

    function getAgentWallet(uint256 agentId) external view returns (address) {
        return _agentWallet[agentId];
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        delete _agentWallet[tokenId];
        return super._update(to, tokenId, auth);
    }

    // ─── Reputation Registry ─────────────────────────────────────────────────

    struct Feedback {
        address client;
        int128 value;
        uint8 valueDecimals;
        string tag1;
        string tag2;
        string feedbackURI;
        bool revoked;
    }

    mapping(uint256 => Feedback[]) private _feedback;

    event NewFeedback(uint256 indexed agentId, address indexed client, uint64 feedbackIndex, int128 value, uint8 valueDecimals, string indexed tag1, string tag1Plain);
    event FeedbackRevoked(uint256 indexed agentId, address indexed client, uint64 feedbackIndex);

    function giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string calldata tag1, string calldata tag2, string calldata feedbackURI) external {
        require(_ownerOf(agentId) != address(0), "agent not found");
        uint64 idx = uint64(_feedback[agentId].length);
        _feedback[agentId].push(Feedback(msg.sender, value, valueDecimals, tag1, tag2, feedbackURI, false));
        emit NewFeedback(agentId, msg.sender, idx, value, valueDecimals, tag1, tag1);
    }

    function revokeFeedback(uint256 agentId, uint64 feedbackIndex) external {
        Feedback storage fb = _feedback[agentId][feedbackIndex];
        require(fb.client == msg.sender, "not feedback author");
        fb.revoked = true;
        emit FeedbackRevoked(agentId, msg.sender, feedbackIndex);
    }

    function getSummary(uint256 agentId) external view returns (uint64 count, int128 total) {
        Feedback[] storage fbs = _feedback[agentId];
        for (uint256 i = 0; i < fbs.length; i++) {
            if (!fbs[i].revoked) { count++; total += fbs[i].value; }
        }
    }

    function readFeedback(uint256 agentId, uint64 index) external view returns (int128 value, uint8 valueDecimals, string memory tag1, string memory tag2, bool revoked) {
        Feedback storage fb = _feedback[agentId][index];
        return (fb.value, fb.valueDecimals, fb.tag1, fb.tag2, fb.revoked);
    }

    // ─── Validation Registry ─────────────────────────────────────────────────

    struct ValidationRequest { address requester; address validator; uint256 agentId; string requestURI; }
    struct ValidationResponse { uint8 response; string responseURI; bytes32 responseHash; string tag; uint256 lastUpdate; }

    mapping(bytes32 => ValidationRequest) private _valRequests;
    mapping(bytes32 => ValidationResponse) private _valResponses;

    event ValidationRequested(bytes32 indexed requestHash, address indexed validator, uint256 indexed agentId);
    event ValidationResponded(bytes32 indexed requestHash, uint8 response, string tag);

    function validationRequest(address validator, uint256 agentId, string calldata requestURI, bytes32 requestHash) external {
        require(_valRequests[requestHash].requester == address(0), "hash already used");
        _valRequests[requestHash] = ValidationRequest(msg.sender, validator, agentId, requestURI);
        emit ValidationRequested(requestHash, validator, agentId);
    }

    function validationResponse(bytes32 requestHash, uint8 response, string calldata responseURI, bytes32 responseHash, string calldata tag) external {
        ValidationRequest storage req = _valRequests[requestHash];
        require(req.validator == msg.sender, "not assigned validator");
        require(req.requester != msg.sender, "self-validation not allowed");
        _valResponses[requestHash] = ValidationResponse(response, responseURI, responseHash, tag, block.timestamp);
        emit ValidationResponded(requestHash, response, tag);
    }

    function getValidationStatus(bytes32 requestHash) external view returns (address validator, uint256 agentId, uint8 response, bytes32 responseHash, string memory tag, uint256 lastUpdate) {
        ValidationRequest storage req = _valRequests[requestHash];
        ValidationResponse storage res = _valResponses[requestHash];
        return (req.validator, req.agentId, res.response, res.responseHash, res.tag, res.lastUpdate);
    }
}
