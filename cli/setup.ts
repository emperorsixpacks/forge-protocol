import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { ethers } from "ethers";
import { KITE_TESTNET } from "forge-sdk";

const CONFIG_PATH = join(homedir(), ".forge", "config.json");

export interface ForgeWallet {
  address: string;
  privateKey: string;
}

export function loadWallet(): ForgeWallet {
  if (!existsSync(CONFIG_PATH)) {
    console.error(JSON.stringify({ error: "No wallet found. Run: forge setup" }));
    process.exit(1);
  }
  return JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
}

export function saveWallet(wallet: ForgeWallet) {
  mkdirSync(join(homedir(), ".forge"), { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(wallet, null, 2), { mode: 0o600 });
}

const ERC20_ABI = ["function balanceOf(address) view returns (uint256)"];
const MIN_USDT = BigInt(process.env.MIN_USDT_WEI ?? "1000000"); // 1 USDT default

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
    next: `Fund your wallet with USDT on Kite testnet, then run: forge setup --wait`,
    faucet: "https://faucet.gokite.ai",
    usdt_contract: KITE_TESTNET.usdtToken,
  }, null, 2));
}

export async function cmdBalance() {
  const { address } = loadWallet();
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL ?? KITE_TESTNET.rpcUrl);
  const usdt = new ethers.Contract(KITE_TESTNET.usdtToken, ERC20_ABI, provider);
  const [eth, usdt_balance] = await Promise.all([
    provider.getBalance(address),
    usdt.balanceOf(address).catch(() => 0n),
  ]);
  const ready = (usdt_balance as bigint) >= MIN_USDT;
  console.log(JSON.stringify({
    address,
    eth: ethers.formatEther(eth),
    usdt: ethers.formatUnits(usdt_balance as bigint, 6),
    ready,
    ...(!ready && { next: "Fund your wallet then run: forge balance" }),
  }, null, 2));
}
  const { address } = loadWallet();
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL ?? KITE_TESTNET.rpcUrl);
  const usdt = new ethers.Contract(KITE_TESTNET.usdtToken, ERC20_ABI, provider);

  console.error(`Waiting for USDT at ${address} ...`);

  while (true) {
    const balance: bigint = await usdt.balanceOf(address).catch(() => 0n);
    if (balance >= MIN_USDT) {
      console.log(JSON.stringify({ ready: true, address, usdt_balance: balance.toString() }));
      return;
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
}
