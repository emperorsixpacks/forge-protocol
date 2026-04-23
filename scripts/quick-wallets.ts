import { ethers } from 'ethers';

console.log("# ── Fresh Agent Wallets (Address + Private Key) ──\n");

const agents = ["web-analyzer", "web-scraper", "validator"];

for (const name of agents) {
  const wallet = ethers.Wallet.createRandom();
  console.log(`### ${name.toUpperCase()}`);
  console.log(`Address:     ${wallet.address}`);
  console.log(`Private Key: ${wallet.privateKey}`);
  console.log(`------------------------------------------\n`);
}

console.log("Usage:");
console.log("1. Put the Private Key in the agent's .env (SELLER_PRIVATE_KEY or VALIDATOR_PRIVATE_KEY)");
console.log("2. Fund the Address with Kite ETH (gas) and USDT (payment/stake)");
