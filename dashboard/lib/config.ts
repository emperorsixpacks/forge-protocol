import "dotenv/config";
import { Keypair } from "@stellar/stellar-sdk";
import { TESTNET, type ForgeConfig } from "forge-sdk";

export const cfg: ForgeConfig = {
  rpcUrl: process.env.STELLAR_RPC_URL ?? TESTNET.rpcUrl,
  networkPassphrase:
    process.env.STELLAR_NETWORK_PASSPHRASE ?? TESTNET.networkPassphrase,
  identityContract:
    process.env.AGENT_IDENTITY_CONTRACT || TESTNET.identityContract,
  commerceContract:
    process.env.AGENTIC_COMMERCE_CONTRACT || TESTNET.commerceContract,
  usdtToken: process.env.USDT_TOKEN_CONTRACT || TESTNET.usdtToken,
};

export const buyerKeypair = Keypair.fromSecret(process.env.BUYER_SECRET!);
export const sellerKeypair = Keypair.fromSecret(process.env.SELLER_SECRET!);

export function getKeypair(wallet: string): Keypair {
  if (wallet === "buyer") return buyerKeypair;
  if (wallet === "seller") return sellerKeypair;
  throw new Error(`Unknown wallet: ${wallet}`);
}
