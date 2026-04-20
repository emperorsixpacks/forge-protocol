import { ethers, upgrades } from "hardhat";

const USDC = process.env.USDC_TOKEN ?? "0x7aB6f3ed87C42eF0aDb67Ed95090f8bF5240149e";
const MIN_STAKE = ethers.parseUnits("1", 6); // 1 USDC

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const Identity = await ethers.getContractFactory("AgentIdentity");
  const identity = await upgrades.deployProxy(Identity, [], { kind: "uups" });
  await identity.waitForDeployment();
  console.log("AgentIdentity:          ", await identity.getAddress());

  const Commerce = await ethers.getContractFactory("AgenticCommerce");
  const commerce = await upgrades.deployProxy(Commerce, [deployer.address], { kind: "uups" });
  await commerce.waitForDeployment();
  console.log("AgenticCommerce:        ", await commerce.getAddress());

  const Passport = await ethers.getContractFactory("AgentPassport");
  const passport = await upgrades.deployProxy(Passport, [], { kind: "uups" });
  await passport.waitForDeployment();
  console.log("AgentPassport:          ", await passport.getAddress());

  const Consensus = await ethers.getContractFactory("ValidatorConsensus");
  const consensus = await upgrades.deployProxy(
    Consensus,
    [USDC, await commerce.getAddress(), MIN_STAKE],
    { kind: "uups" }
  );
  await consensus.waitForDeployment();
  console.log("ValidatorConsensus:     ", await consensus.getAddress());
}

main().catch((e) => { console.error(e); process.exit(1); });
