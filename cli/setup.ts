import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { ethers } from "ethers";
import { KITE_TESTNET } from "marc-sdk";

const CONFIG_PATH = join(homedir(), ".marc", "config.json");

export interface MarcWallet {
  address: string;
  privateKey: string;
}

export function loadWallet(): MarcWallet {
  if (!existsSync(CONFIG_PATH)) {
    console.error(JSON.stringify({ error: "No wallet found. Run: marc setup" }));
    process.exit(1);
  }
  return JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
}

export function saveWallet(wallet: MarcWallet) {
  mkdirSync(join(homedir(), ".marc"), { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(wallet, null, 2), { mode: 0o600 });
}

const ERC20_ABI = ["function balanceOf(address) view returns (uint256)"];
const MIN_USDC = BigInt(process.env.MIN_USDC_WEI ?? "1000000"); // 1 USDC default

export async function cmdSetup() {
  if (existsSync(CONFIG_PATH)) {
    const existing = loadWallet();
    console.log(JSON.stringify({ already_setup: true, address: existing.address, config: CONFIG_PATH }));
    return;
  }

  const wallet = ethers.Wallet.createRandom();
  saveWallet({ address: wallet.address, privateKey: wallet.privateKey });

  console.log(JSON.stringify({
    address: wallet.address,
    config: CONFIG_PATH,
    next: `Fund your wallet with USDC on Kite testnet, then run: marc setup --wait`,
    faucet: "https://faucet.gokite.ai",
    usdc_contract: KITE_TESTNET.usdcToken,
  }, null, 2));
}

export async function cmdSetupWait() {
  const { address } = loadWallet();
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL ?? KITE_TESTNET.rpcUrl);
  const usdc = new ethers.Contract(KITE_TESTNET.usdcToken, ERC20_ABI, provider);

  console.error(`Waiting for USDC at ${address} ...`);

  while (true) {
    const balance: bigint = await usdc.balanceOf(address).catch(() => 0n);
    if (balance >= MIN_USDC) {
      console.log(JSON.stringify({ ready: true, address, usdc_balance: balance.toString() }));
      return;
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
}
