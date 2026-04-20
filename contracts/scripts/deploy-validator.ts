import { ethers, upgrades } from "hardhat";

const USDC     = process.env.USDC_TOKEN        ?? "0x7aB6f3ed87C42eF0aDb67Ed95090f8bF5240149e";
const COMMERCE = process.env.COMMERCE_CONTRACT ?? "0xeCee1A2115a5A2c6279Bf88870e658ed813374D0";
const MIN_STAKE = ethers.parseUnits("1", 6); // 1 USDC

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying ValidatorConsensus with:", deployer.address);

  const Consensus = await ethers.getContractFactory("ValidatorConsensus");
  const consensus = await upgrades.deployProxy(Consensus, [USDC, COMMERCE, MIN_STAKE], { kind: "uups" });
  await consensus.waitForDeployment();

  const address = await consensus.getAddress();
  console.log("ValidatorConsensus:", address);
  console.log("\nAdd to your .env:");
  console.log(`VALIDATOR_CONSENSUS_CONTRACT=${address}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
