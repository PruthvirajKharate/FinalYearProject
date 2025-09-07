import { ethers } from "hardhat";

async function main() {
  // Explicitly tell Hardhat which contract to use
  const YenToken = await ethers.getContractFactory("contracts/YenToken.sol:YenToken");
  const yen = await YenToken.deploy(1000);

  await yen.waitForDeployment();
  console.log("YenToken deployed to:", await yen.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
