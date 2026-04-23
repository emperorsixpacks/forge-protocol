import { ethers, upgrades } from "hardhat";

const USDT     = process.env.USDT_TOKEN        ?? "0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63";
const COMMERCE = process.env.COMMERCE_CONTRACT ?? "0xeCee1A2115a5A2c6279Bf88870e658ed813374D0";
const MIN_STAKE = ethers.parseUnits("1", 18); // 1 USDT (18 decimals)

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying ValidatorConsensus with:", deployer.address);

  const Consensus = await ethers.getContractFactory("ValidatorConsensus");
  const consensus = await upgrades.deployProxy(Consensus, [USDT, COMMERCE, MIN_STAKE], { kind: "uups" });
  await consensus.waitForDeployment();

  const address = await consensus.getAddress();
  console.log("ValidatorConsensus:", address);
  console.log("\nAdd to your .env:");
  console.log(`VALIDATOR_CONSENSUS_CONTRACT=${address}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
