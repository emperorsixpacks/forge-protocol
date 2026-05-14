import { ethers, upgrades } from "hardhat";

const COMMERCE = process.env.COMMERCE_CONTRACT ?? "0xeCee1A2115a5A2c6279Bf88870e658ed813374D0";
const MIN_STAKE = ethers.parseUnits("0.001", 18);
const EXISTING_PROXY = process.env.PROXY; // set to upgrade instead of fresh deploy

async function main() {
  const [deployer] = await ethers.getSigners();
  const Consensus = await ethers.getContractFactory("ValidatorConsensus");

  let address: string;
  if (EXISTING_PROXY) {
    console.log("Upgrading ValidatorConsensus proxy at:", EXISTING_PROXY);
    const upgraded = await upgrades.upgradeProxy(EXISTING_PROXY, Consensus, { kind: "uups" });
    await upgraded.waitForDeployment();
    address = await upgraded.getAddress();
    console.log("ValidatorConsensus upgraded at:", address);
  } else {
    console.log("Deploying ValidatorConsensus with:", deployer.address);
    const consensus = await upgrades.deployProxy(Consensus, [COMMERCE, MIN_STAKE], { kind: "uups" });
    await consensus.waitForDeployment();
    address = await consensus.getAddress();
    console.log("ValidatorConsensus:", address);
    console.log("\nAdd to your .env:");
    console.log(`VALIDATOR_CONSENSUS_CONTRACT=${address}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
