import { Contract, ContractRunner } from "ethers";
import type { MarcConfig } from "./types.js";

const ABI = [
  "function stake(uint256 amount)",
  "function unstake()",
  "function requestValidation(uint64 jobId)",
  "function vote(uint64 jobId, bool approve)",
  "function roundStatus(uint64 jobId) view returns (bool open, uint256 approvals, uint256 rejections)",
  "function hasVoted(uint64 jobId, address validator) view returns (bool)",
  "function validatorCount() view returns (uint256)",
  "function staked(address) view returns (uint256)",
  "function depositRewards(uint256 amount)",
  "function minStake() view returns (uint256)",
];

const ERC20_ABI = ["function approve(address spender, uint256 amount) returns (bool)"];

export class ValidatorConsensusClient {
  private contract: Contract;

  constructor(private cfg: MarcConfig) {
    this.contract = new Contract(cfg.validatorConsensusContract, ABI, cfg.signerOrProvider as ContractRunner);
  }

  async stake(amount: bigint): Promise<void> {
    const erc20 = new Contract(this.cfg.usdcToken, ERC20_ABI, this.cfg.signerOrProvider as ContractRunner);
    await (await erc20.approve(this.cfg.validatorConsensusContract, amount)).wait();
    const tx = await this.contract.stake(amount);
    const receipt = await tx.wait();
    this.cfg.onTx?.(receipt.hash, "stake");
  }

  async unstake(): Promise<void> {
    const tx = await this.contract.unstake();
    const receipt = await tx.wait();
    this.cfg.onTx?.(receipt.hash, "unstake");
  }

  async requestValidation(jobId: bigint): Promise<void> {
    const tx = await this.contract.requestValidation(jobId);
    const receipt = await tx.wait();
    this.cfg.onTx?.(receipt.hash, "requestValidation");
  }

  async vote(jobId: bigint, approve: boolean): Promise<void> {
    const tx = await this.contract.vote(jobId, approve);
    const receipt = await tx.wait();
    this.cfg.onTx?.(receipt.hash, "vote");
  }

  async roundStatus(jobId: bigint): Promise<{ open: boolean; approvals: bigint; rejections: bigint }> {
    const [open, approvals, rejections] = await this.contract.roundStatus(jobId);
    return { open, approvals, rejections };
  }

  async hasVoted(jobId: bigint, validator: string): Promise<boolean> {
    return this.contract.hasVoted(jobId, validator);
  }

  async stakedAmount(validator: string): Promise<bigint> {
    return this.contract.staked(validator);
  }

  async minStake(): Promise<bigint> {
    return this.contract.minStake();
  }

  async validatorCount(): Promise<bigint> {
    return this.contract.validatorCount();
  }

  async depositRewards(amount: bigint): Promise<void> {
    const erc20 = new Contract(this.cfg.usdcToken, ERC20_ABI, this.cfg.signerOrProvider as ContractRunner);
    await (await erc20.approve(this.cfg.validatorConsensusContract, amount)).wait();
    const tx = await this.contract.depositRewards(amount);
    await tx.wait();
  }
}
