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

export interface ForgeConfig {
  /** ethers Signer (for write ops) or Provider (for read-only). */
  signerOrProvider: Signer | Provider;
  identityContract: Address;
  commerceContract: Address;
  passportContract: Address;
  validatorConsensusContract: Address;
  /** USDT on Kite: 0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63 */
  usdtToken: Address;
  onTx?: (hash: string, method: string) => void;
}

export interface LLMProvider {
  complete(prompt: string): Promise<string>;
}

/** Kite Testnet deployment */
export const KITE_TESTNET = {
  chainId: 2368,
  rpcUrl: "https://rpc-testnet.gokite.ai/",
  registryUrl: "http://localhost:3001", // TODO: swap to hosted URL when deployed
  identityContract: "0x3e0Ad2339f8e88Ff07AF2E515428527a8DF1E96A" as Address,
  commerceContract: "0xeCee1A2115a5A2c6279Bf88870e658ed813374D0" as Address,
  passportContract: "0xAe325718BdD9F07C402B8544fBbB019FD8b0A36C" as Address,
  validatorConsensusContract: "0xb8F2233Be2c413bB9235F51E1531B3C64A135b25" as Address,
  usdtToken: "0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63" as Address,
} as const;
