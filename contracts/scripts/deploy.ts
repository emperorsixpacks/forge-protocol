import { ethers, upgrades } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const Identity = await ethers.getContractFactory("AgentIdentity");
  const identity = await upgrades.deployProxy(Identity, [], { kind: "uups" });
  await identity.waitForDeployment();
  console.log("AgentIdentity:    ", await identity.getAddress());

  const Commerce = await ethers.getContractFactory("AgenticCommerce");
  const commerce = await upgrades.deployProxy(Commerce, [deployer.address], { kind: "uups" });
  await commerce.waitForDeployment();
  console.log("AgenticCommerce:  ", await commerce.getAddress());

  const Passport = await ethers.getContractFactory("AgentPassport");
  const passport = await upgrades.deployProxy(Passport, [], { kind: "uups" });
  await passport.waitForDeployment();
  console.log("AgentPassport:    ", await passport.getAddress());
}

main().catch((e) => { console.error(e); process.exit(1); });
