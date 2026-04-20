import { Contract, ContractRunner } from "ethers";
import type { Job, JobStatus, MarcConfig } from "./types.js";
import { ValidatorConsensusClient } from "./validatorConsensus.js";

const ABI = [
  "function createJob(address provider, address evaluator, address token, uint256 budget, string description) returns (uint64)",
  "function submit(uint64 id, string deliverable)",
  "function complete(uint64 id)",
  "function reject(uint64 id)",
  "function cancel(uint64 id)",
  "function getJob(uint64 id) view returns (tuple(uint64 id, address client, address provider, address evaluator, address token, uint256 budget, uint8 status, string description, string deliverable))",
  "function feeBps() view returns (uint16)",
  "function setTreasury(address newTreasury)",
  "function setFeeBps(uint16 newBps)",
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

export class CommerceClient {
  private contract: Contract;

  constructor(private cfg: MarcConfig) {
    this.contract = new Contract(cfg.commerceContract, ABI, cfg.signerOrProvider as ContractRunner);
  }

  /** Approve USDC spend + create escrow job. Returns jobId. */
  async createJob(
    provider: string,
    evaluator: string,
    token: string,
    budget: bigint,
    description: string,
  ): Promise<bigint> {
    // approve token spend first
    const erc20 = new Contract(token, ERC20_ABI, this.cfg.signerOrProvider as ContractRunner);
    const approveTx = await erc20.approve(this.cfg.commerceContract, budget);
    await approveTx.wait();

    const tx = await this.contract.createJob(provider, evaluator, token, budget, description);
    const receipt = await tx.wait();
    this.cfg.onTx?.(receipt.hash, "createJob");
    for (const log of receipt.logs) {
      try {
        const parsed = this.contract.interface.parseLog(log);
        if (parsed?.name === "JobCreated") return parsed.args.jobId as bigint;
      } catch {}
    }
    throw new Error("JobCreated event not found");
  }

  async submit(jobId: bigint, deliverable: string): Promise<void> {
    const tx = await this.contract.submit(jobId, deliverable);
    const receipt = await tx.wait();
    this.cfg.onTx?.(receipt.hash, "submit");

    // auto-trigger validator consensus if configured
    if (this.cfg.validatorConsensusContract) {
      await new ValidatorConsensusClient(this.cfg).requestValidation(jobId);
    }
  }

  async complete(jobId: bigint): Promise<void> {
    const tx = await this.contract.complete(jobId);
    const receipt = await tx.wait();
    this.cfg.onTx?.(receipt.hash, "complete");
  }

  async reject(jobId: bigint): Promise<void> {
    const tx = await this.contract.reject(jobId);
    const receipt = await tx.wait();
    this.cfg.onTx?.(receipt.hash, "reject");
  }

  async cancel(jobId: bigint): Promise<void> {
    const tx = await this.contract.cancel(jobId);
    const receipt = await tx.wait();
    this.cfg.onTx?.(receipt.hash, "cancel");
  }

  async getJob(jobId: bigint): Promise<Job> {
    const j = await this.contract.getJob(jobId);
    return {
      id: j.id,
      client: j.client,
      provider: j.provider,
      evaluator: j.evaluator,
      token: j.token,
      budget: j.budget,
      status: j.status as JobStatus,
      description: j.description,
      deliverable: j.deliverable,
    };
  }

  async feeBps(): Promise<number> {
    return Number(await this.contract.feeBps());
  }
}
