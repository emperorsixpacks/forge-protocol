import type { Signer, Provider } from "ethers";

export type Address = string;

export interface Agent {
  id: bigint;
  owner: Address;
  uri: string;
}

export enum JobStatus {
  Funded = 0,
  Submitted = 1,
  Completed = 2,
  Rejected = 3,
  Cancelled = 4,
}

export interface Job {
  id: bigint;
  client: Address;
  provider: Address;
  evaluator: Address;
  token: Address;
  budget: bigint;
  status: JobStatus;
  description: string;
  deliverable: string;
}

export interface Session {
  owner: Address;
  agent: Address;
  token: Address;
  maxSpend: bigint;
  spent: bigint;
  expiresAt: bigint;
  revoked: boolean;
}

export interface LLMProvider {
  complete(prompt: string): Promise<string>;
}

export interface MarcConfig {
  /** ethers Signer (for write ops) or Provider (for read-only). */
  signerOrProvider: Signer | Provider;
  identityContract: Address;
  commerceContract: Address;
  passportContract: Address;
  /** USDC.e on Kite: 0x7aB6f3ed87C42eF0aDb67Ed95090f8bF5240149e */
  usdcToken: Address;
  onTx?: (hash: string, method: string) => void;
}

/** Kite Testnet deployment */
export const KITE_TESTNET = {
  chainId: 2368,
  rpcUrl: "https://rpc-testnet.gokite.ai/",
  identityContract: "0x3e0Ad2339f8e88Ff07AF2E515428527a8DF1E96A" as Address,
  commerceContract: "0xeCee1A2115a5A2c6279Bf88870e658ed813374D0" as Address,
  passportContract: "0xAe325718BdD9F07C402B8544fBbB019FD8b0A36C" as Address,
  usdcToken: "0x7aB6f3ed87C42eF0aDb67Ed95090f8bF5240149e" as Address,
} as const;

/** Kite Mainnet deployment */
export const KITE_MAINNET = {
  chainId: 2366,
  rpcUrl: "https://rpc.gokite.ai/",
  identityContract: "" as Address,
  commerceContract: "" as Address,
  passportContract: "" as Address,
  usdcToken: "0x7aB6f3ed87C42eF0aDb67Ed95090f8bF5240149e" as Address,
} as const;
