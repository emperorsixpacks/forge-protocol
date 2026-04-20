import { Contract, ContractRunner } from "ethers";
import type { Session, ForgeConfig } from "./types.js";

const ABI = [
  "function openSession(address agent, address token, uint256 maxSpend, uint256 expiresAt) returns (uint64)",
  "function spend(uint64 sessionId, address to, uint256 amount)",
  "function revokeSession(uint64 sessionId)",
  "function getSession(uint64 sessionId) view returns (tuple(address owner, address agent, address token, uint256 maxSpend, uint256 spent, uint256 expiresAt, bool revoked))",
  "function remaining(uint64 sessionId) view returns (uint256)",
  "function activeSession(address owner, address agent) view returns (uint64)",
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
];

export class PassportClient {
  private contract: Contract;

  constructor(private cfg: ForgeConfig) {
    this.contract = new Contract(cfg.passportContract, ABI, cfg.signerOrProvider as ContractRunner);
  }

  /** Approve token + open a spending session for an agent. Returns sessionId. */
  async openSession(agent: string, token: string, maxSpend: bigint, expiresAt: number): Promise<bigint> {
    const erc20 = new Contract(token, ERC20_ABI, this.cfg.signerOrProvider as ContractRunner);
    const approveTx = await erc20.approve(this.cfg.passportContract, maxSpend);
    await approveTx.wait();

    const tx = await this.contract.openSession(agent, token, maxSpend, expiresAt);
    const receipt = await tx.wait();
    this.cfg.onTx?.(receipt.hash, "openSession");
    for (const log of receipt.logs) {
      try {
        const parsed = this.contract.interface.parseLog(log);
        if (parsed?.name === "SessionOpened") return parsed.args.sessionId as bigint;
      } catch {}
    }
    throw new Error("SessionOpened event not found");
  }

  async spend(sessionId: bigint, to: string, amount: bigint): Promise<void> {
    const tx = await this.contract.spend(sessionId, to, amount);
    const receipt = await tx.wait();
    this.cfg.onTx?.(receipt.hash, "spend");
  }

  async revokeSession(sessionId: bigint): Promise<void> {
    const tx = await this.contract.revokeSession(sessionId);
    await tx.wait();
  }

  async getSession(sessionId: bigint): Promise<Session> {
    const s = await this.contract.getSession(sessionId);
    return {
      owner: s.owner,
      agent: s.agent,
      token: s.token,
      maxSpend: s.maxSpend,
      spent: s.spent,
      expiresAt: s.expiresAt,
      revoked: s.revoked,
    };
  }

  async remaining(sessionId: bigint): Promise<bigint> {
    return this.contract.remaining(sessionId);
  }

  async activeSession(owner: string, agent: string): Promise<bigint> {
    return this.contract.activeSession(owner, agent);
  }
}
