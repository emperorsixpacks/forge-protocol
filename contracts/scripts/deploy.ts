import { ethers, upgrades } from "hardhat";

const USDT = process.env.USDT_TOKEN ?? "0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63";
const MIN_STAKE = ethers.parseUnits("1", 18); // 1 USDT (18 decimals)

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
    [USDT, await commerce.getAddress(), MIN_STAKE],
    { kind: "uups" }
  );
  await consensus.waitForDeployment();
  console.log("ValidatorConsensus:     ", await consensus.getAddress());
}

main().catch((e) => { console.error(e); process.exit(1); });
