const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();

  const mockAggregator = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const usd = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const rs = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
  const yen = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";

  console.log("Deploying new LendingPool...");
  const LendingPool = await ethers.getContractFactory("LendingPool");
  const pool = await LendingPool.deploy();
  await pool.waitForDeployment();
  const poolAddress = await pool.getAddress();
  console.log("New LendingPool deployed to:", poolAddress);

  // addReserve for USD (Low risk)
  console.log("Adding USD Reserve...");
  await (await pool.addReserve(ethers.encodeBytes32String("USD"), usd, mockAggregator, 500, false)).wait();

  // addReserve for RS (High risk)
  console.log("Adding RS Reserve...");
  await (await pool.addReserve(ethers.encodeBytes32String("RS"), rs, mockAggregator, 700, true)).wait();

  // addReserve for YEN (Low risk)
  console.log("Adding YEN Reserve...");
  await (await pool.addReserve(ethers.encodeBytes32String("YEN"), yen, mockAggregator, 600, false)).wait();

  console.log("Approving Liquidator Bankroll...");
  const USDToken = await ethers.getContractAt("USDToken", usd, deployer);
  const RSToken = await ethers.getContractAt("RupeeToken", rs, deployer);
  const YenToken = await ethers.getContractAt("YenToken", yen, deployer);

  await USDToken.approve(poolAddress, ethers.MaxUint256);
  await RSToken.approve(poolAddress, ethers.MaxUint256);
  await YenToken.approve(poolAddress, ethers.MaxUint256);

  console.log("Funding pool...");
  await (await pool.deposit(ethers.encodeBytes32String("USD"), ethers.parseUnits("100000", 18))).wait();
  await (await pool.deposit(ethers.encodeBytes32String("RS"), ethers.parseUnits("100000", 18))).wait();
  await (await pool.deposit(ethers.encodeBytes32String("YEN"), ethers.parseUnits("100000", 18))).wait();

  console.log("Updating contracts.ts...");
  const contractsPath = path.join(__dirname, "frontend", "src", "contracts.ts");
  let content = fs.readFileSync(contractsPath, "utf8");
  content = content.replace(/address: "0x[a-fA-F0-9]{40}"/g, (match, offset, str) => {
    // Only replace the LendingPool address, which is the first one
    if (str.substring(0, offset).includes("lendingPool: {")) {
      return `address: "${poolAddress}"`;
    }
    return match;
  });
  fs.writeFileSync(contractsPath, content);

  console.log("Updating backend watcher...");
  const watcherPath = path.join(__dirname, "server", "src", "transaction", "blockchain-watcher.service.ts");
  let watcherContent = fs.readFileSync(watcherPath, "utf8");
  watcherContent = watcherContent.replace(/CONTRACT_ADDRESS = "0x[a-fA-F0-9]{40}"/, `CONTRACT_ADDRESS = "${poolAddress}"`);
  fs.writeFileSync(watcherPath, watcherContent);

  console.log("✅ Done updating!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
