import { expect } from "chai";
import { ethers } from "hardhat";

const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("LendingPool (integrated flow)", function () {
  it("should allow deposit (lender), depositCollateral + borrow (borrower), and repay with time-based interest", async function () {
    const [deployer, user1] = await ethers.getSigners();

    // 1) Deploy MockAggregator (8 decimals, price = 2000 * 1e8)
    const MockAggregator = await ethers.getContractFactory("MockAggregator");
    const mockAggregator = await MockAggregator.deploy(8, 2000n * 10n ** 8n);
    await mockAggregator.waitForDeployment();

    // 2) Deploy tokens
    const USD = await ethers.getContractFactory("USDToken");
    const usd = await USD.deploy(1_000_000); // Assuming this is 18 decimals
    await usd.waitForDeployment();

    const Rupee = await ethers.getContractFactory("RupeeToken");
    const rs = await Rupee.deploy(1_000_000);
    await rs.waitForDeployment();

    const Yen = await ethers.getContractFactory("YenToken");
    const yen = await Yen.deploy(1_000_000);
    await yen.waitForDeployment();

    // 3) Deploy LendingPool
    const LendingPool = await ethers.getContractFactory("LendingPool");
    const pool = await LendingPool.deploy();
    await pool.waitForDeployment();

    // 4) Add reserves
    const usdSymbol = ethers.encodeBytes32String("USD");
    await (await pool.addReserve(usdSymbol, await usd.getAddress(), await mockAggregator.getAddress(), 500, false)).wait();
    await (await pool.addReserve(ethers.encodeBytes32String("RS"), await rs.getAddress(), await mockAggregator.getAddress(), 700, true)).wait();
    await (await pool.addReserve(ethers.encodeBytes32String("YEN"), await yen.getAddress(), await mockAggregator.getAddress(), 600, false)).wait();

    // ---------- Lender flow ----------
    const depositAmount = ethers.parseUnits("500", 18);
    await (await usd.approve(await pool.getAddress(), depositAmount)).wait();
    await (await pool.deposit(usdSymbol, depositAmount)).wait();

    // ---------- Borrower flow ----------
    const collateralEth = ethers.parseEther("1");
    await (await pool.connect(user1).depositCollateral({ value: collateralEth })).wait();

    const borrowAmount = ethers.parseUnits("100", 18);
    await (await pool.connect(user1).borrow(usdSymbol, borrowAmount, 0, 0)).wait();

    const loanBefore = await pool.loans(await user1.getAddress());
    expect(loanBefore.principal).to.equal(borrowAmount);
    expect(loanBefore.active).to.equal(true);

    // ---------- Time Travel (NEW) ----------
    // We simulate 30 days passing to ensure interest is > 0
    const THIRTY_DAYS = 30 * 24 * 60 * 60;
    await time.increase(THIRTY_DAYS);

    // ---------- Repay flow ----------
    // Use the contract's new formula: (P * R * T) / (BPS_DENOM * SECONDS_PER_YEAR)
    const rateBps = 500n;
    const BPS_DENOM = 10000n;
    const SECONDS_PER_YEAR = 31536000n;
    const timeElapsed = BigInt(THIRTY_DAYS);

    const denominator = BPS_DENOM * SECONDS_PER_YEAR;
    const interest = (borrowAmount * rateBps * timeElapsed + (denominator - 1n)) / denominator;
    const totalOwed = borrowAmount + interest;

    // Give user1 the extra USD needed to cover the interest
    await (await usd.transfer(await user1.getAddress(), interest + ethers.parseUnits("1", 18))).wait();

    // In LendingPool.test.ts, change your approval to this:
    const extraBuffer = ethers.parseUnits("1", 18); // 1 token extra buffer
    await (await usd.connect(user1).approve(await pool.getAddress(), totalOwed + extraBuffer)).wait();

    // Perform Repay
    await (await pool.connect(user1).repay()).wait();

    // Verify
    const loanAfter = await pool.loans(await user1.getAddress());
    expect(loanAfter.active).to.equal(false);
    expect(loanAfter.principal).to.equal(0n);

    console.log(`Test passed! Interest paid for 30 days: ${ethers.formatUnits(interest, 18)} USD`);
  });
});