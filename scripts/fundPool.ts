import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  const LENDING_POOL_ADDR = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";
  const USD_ADDR = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const RS_ADDR = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
  const YEN_ADDR = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";

  const LendingPool = await ethers.getContractAt("LendingPool", LENDING_POOL_ADDR, deployer);
  const USD = await ethers.getContractAt("USDToken", USD_ADDR, deployer);
  const RS = await ethers.getContractAt("RupeeToken", RS_ADDR, deployer);
  const YEN = await ethers.getContractAt("YenToken", YEN_ADDR, deployer);

  console.log("Approving tokens for pool...");
  await USD.approve(LENDING_POOL_ADDR, ethers.MaxUint256);
  await RS.approve(LENDING_POOL_ADDR, ethers.MaxUint256);
  await YEN.approve(LENDING_POOL_ADDR, ethers.MaxUint256);

  console.log("Depositing liquidity...");
  let tx1 = await LendingPool.deposit(ethers.encodeBytes32String("USD"), ethers.parseUnits("100000", 18));
  await tx1.wait();
  let tx2 = await LendingPool.deposit(ethers.encodeBytes32String("RS"), ethers.parseUnits("100000", 18));
  await tx2.wait();
  let tx3 = await LendingPool.deposit(ethers.encodeBytes32String("YEN"), ethers.parseUnits("100000", 18));
  await tx3.wait();

  console.log("Pool funded successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
