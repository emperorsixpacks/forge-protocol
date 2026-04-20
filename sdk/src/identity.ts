import { Contract, ContractRunner } from "ethers";
import type { Agent, ForgeConfig } from "./types.js";

const ABI = [
  "function register(string agentURI) returns (uint256)",
  "function setAgentURI(uint256 agentId, string newURI)",
  "function setMetadata(uint256 agentId, string key, bytes value)",
  "function getMetadata(uint256 agentId, string key) view returns (bytes)",
  "function setAgentWallet(uint256 agentId, address wallet)",
  "function unsetAgentWallet(uint256 agentId)",
  "function getAgentWallet(uint256 agentId) view returns (address)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string tag1, string tag2, string feedbackURI)",
  "function revokeFeedback(uint256 agentId, uint64 feedbackIndex)",
  "function getSummary(uint256 agentId) view returns (uint64 count, int128 total)",
  "function readFeedback(uint256 agentId, uint64 index) view returns (int128 value, uint8 valueDecimals, string tag1, string tag2, bool revoked)",
  "function validationRequest(address validator, uint256 agentId, string requestURI, bytes32 requestHash)",
  "function validationResponse(bytes32 requestHash, uint8 response, string responseURI, bytes32 responseHash, string tag)",
  "function getValidationStatus(bytes32 requestHash) view returns (address validator, uint256 agentId, uint8 response, bytes32 responseHash, string tag, uint256 lastUpdate)",
];

export class IdentityClient {
  private contract: Contract;

  constructor(private cfg: ForgeConfig) {
    this.contract = new Contract(cfg.identityContract, ABI, cfg.signerOrProvider as ContractRunner);
  }

  async register(uri: string): Promise<bigint> {
    const tx = await this.contract.register(uri);
    const receipt = await tx.wait();
    this.cfg.onTx?.(receipt.hash, "register");
    // parse agentId from Transfer event (ERC-721 mint)
    const iface = this.contract.interface;
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "AgentRegistered") return parsed.args.agentId as bigint;
      } catch {}
    }
    throw new Error("AgentRegistered event not found");
  }

  async getAgent(id: bigint): Promise<Agent | null> {
    try {
      const [owner, uri] = await Promise.all([
        this.contract.ownerOf(id),
        this.contract.tokenURI(id),
      ]);
      return { id, owner, uri };
    } catch {
      return null;
    }
  }

  async setAgentURI(agentId: bigint, newUri: string): Promise<void> {
    const tx = await this.contract.setAgentURI(agentId, newUri);
    await tx.wait();
  }

  async setAgentWallet(agentId: bigint, wallet: string): Promise<void> {
    const tx = await this.contract.setAgentWallet(agentId, wallet);
    await tx.wait();
  }

  async getAgentWallet(agentId: bigint): Promise<string> {
    return this.contract.getAgentWallet(agentId);
  }

  async giveFeedback(agentId: bigint, value: bigint, valueDecimals: number, tag1: string, tag2: string, feedbackURI: string): Promise<void> {
    const tx = await this.contract.giveFeedback(agentId, value, valueDecimals, tag1, tag2, feedbackURI);
    await tx.wait();
  }

  async getSummary(agentId: bigint): Promise<{ count: bigint; total: bigint }> {
    const [count, total] = await this.contract.getSummary(agentId);
    return { count, total };
  }

  async validationRequest(validator: string, agentId: bigint, requestURI: string, requestHash: string): Promise<void> {
    const tx = await this.contract.validationRequest(validator, agentId, requestURI, requestHash);
    await tx.wait();
  }

  async validationResponse(requestHash: string, response: number, responseURI: string, responseHash: string, tag: string): Promise<void> {
    const tx = await this.contract.validationResponse(requestHash, response, responseURI, responseHash, tag);
    await tx.wait();
  }
}
