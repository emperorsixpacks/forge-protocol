import "dotenv/config";
import { ethers } from "ethers";
import { KITE_TESTNET, type ForgeConfig } from "forge-sdk";

export const provider = new ethers.JsonRpcProvider(
  process.env.RPC_URL ?? KITE_TESTNET.rpcUrl,
  { chainId: 2368, name: "kite-testnet" },
  { staticNetwork: true },
);

// Read-only config (no signer needed for dashboard reads)
export const cfg: ForgeConfig = {
  signerOrProvider: provider,
  identityContract: KITE_TESTNET.identityContract,
  commerceContract: KITE_TESTNET.commerceContract,
  passportContract: KITE_TESTNET.passportContract,
  validatorConsensusContract: KITE_TESTNET.validatorConsensusContract,
  usdtToken: KITE_TESTNET.usdtToken,
};

// Known validator addresses from agent .env files
export const KNOWN_VALIDATORS: string[] = (
  process.env.KNOWN_VALIDATORS ?? ""
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
