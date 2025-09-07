import { ethers } from "hardhat";

async function main() {
  // 1. Deploy MockAggregator (price feed)
  const MockAggregator = await ethers.getContractFactory("MockAggregator");
  const mockAggregator = await MockAggregator.deploy(8, 2000 * 10 ** 8); // 8 decimals, ETH=2000
  await mockAggregator.waitForDeployment();
  console.log("MockAggregator deployed to:", await mockAggregator.getAddress());

  // 2. Deploy ERC20 tokens
  const USD = await ethers.getContractFactory("USDToken");
  const usd = await USD.deploy(1_000_000);
  await usd.waitForDeployment();
  console.log("USDToken deployed to:", await usd.getAddress());

  const RS = await ethers.getContractFactory("RupeeToken");
  const rs = await RS.deploy(1_000_000);
  await rs.waitForDeployment();
  console.log("RSToken deployed to:", await rs.getAddress());

  const Yen = await ethers.getContractFactory("YenToken");
  const yen = await Yen.deploy(1_000_000);
  await yen.waitForDeployment();
  console.log("YenToken deployed to:", await yen.getAddress());

  // 3. Deploy LendingPool with oracle address
  const LendingPool = await ethers.getContractFactory("LendingPool");
  const pool = await LendingPool.deploy();
  await pool.waitForDeployment();
  console.log("LendingPool deployed to:", await pool.getAddress());

  // ✅ Done
  console.log("\n📜 Deployment Summary:");
  console.log("MockAggregator:", await mockAggregator.getAddress());
  console.log("USDToken:", await usd.getAddress());
  console.log("RSToken:", await rs.getAddress());
  console.log("YenToken:", await yen.getAddress());
  console.log("LendingPool:", await pool.getAddress());

  // addReserve for USD
  let tx = await pool.addReserve(
    ethers.encodeBytes32String("USD"),
    await usd.getAddress(),
    await mockAggregator.getAddress(),
    500 // 5% interest
  );
  await tx.wait(); // wait for the transaction to be mined

  // addReserve for RS
  tx = await pool.addReserve(
    ethers.encodeBytes32String("RS"),
    await rs.getAddress(),
    await mockAggregator.getAddress(),
    700
  );
  await tx.wait();

  // addReserve for YEN
  tx = await pool.addReserve(
    ethers.encodeBytes32String("YEN"),
    await yen.getAddress(),
    await mockAggregator.getAddress(),
    600
  );
  await tx.wait();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
