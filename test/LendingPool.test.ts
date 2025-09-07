import { expect } from "chai";
import { ethers } from "hardhat";

describe("LendingPool (integrated flow)", function () {
  it("should allow deposit (lender), depositCollateral + borrow (borrower), and repay", async function () {
    const [deployer, user1] = await ethers.getSigners();

    // 1) Deploy MockAggregator (8 decimals, price = 2000 * 1e8)
    const MockAggregator = await ethers.getContractFactory("MockAggregator");
    const mockAggregator = await MockAggregator.deploy(8, 2000n * 10n ** 8n);
    await mockAggregator.waitForDeployment();

    // 2) Deploy tokens (deployer receives initial supply)
    const USD = await ethers.getContractFactory("USDToken");
    const usd = await USD.deploy(1_000_000);
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

    // 4) Add reserves (use bytes32 symbols)
    let tx = await pool.addReserve(
      ethers.encodeBytes32String("USD"),
      await usd.getAddress(),
      await mockAggregator.getAddress(),
      500 // 5% bps
    );
    await tx.wait();

    tx = await pool.addReserve(
      ethers.encodeBytes32String("RS"),
      await rs.getAddress(),
      await mockAggregator.getAddress(),
      700 // 7% bps
    );
    await tx.wait();

    tx = await pool.addReserve(
      ethers.encodeBytes32String("YEN"),
      await yen.getAddress(),
      await mockAggregator.getAddress(),
      600 // 6% bps
    );
    await tx.wait();

    // ---------- Lender flow ----------
    // Deployer is lender: approve and deposit 500 USD (use 18-decimals units)
    const depositAmount = ethers.parseUnits("500", 18); // 500 tokens
    await (await usd.approve(await pool.getAddress(), depositAmount)).wait();
    await (
      await pool.deposit(ethers.encodeBytes32String("USD"), depositAmount)
    ).wait();

    // Check lender balance mapping: lenderBalances(bytes32, address)
    const lenderBalance = await pool.lenderBalances(
      ethers.encodeBytes32String("USD"),
      await deployer.getAddress()
    );
    expect(lenderBalance).to.equal(depositAmount);

    // ---------- Borrower flow ----------
    // user1 deposits ETH collateral
    const collateralEth = ethers.parseEther("1"); // 1 ETH
    await (
      await pool.connect(user1).depositCollateral({ value: collateralEth })
    ).wait();

    // Borrow 100 USD tokens (principal). Use token units:
    const borrowAmount = ethers.parseUnits("100", 18);

    // Borrow signature: borrow(bytes32 symbol, uint256 amount, uint256 maxPriceSlippageBps, uint256 expectedEthUsd)
    // We pass slippage=0 and expectedEthUsd=0 to skip slippage check in this test.
    await (
      await pool
        .connect(user1)
        .borrow(ethers.encodeBytes32String("USD"), borrowAmount, 0, 0)
    ).wait();

    // Check loan recorded
    const loanBefore = await pool.loans(await user1.getAddress());
    expect(loanBefore.principal).to.equal(borrowAmount);
    expect(loanBefore.active).to.equal(true);

    // ---------- Repay flow ----------
    // Compute interest as contract does: interest = ceil(principal * rateBps / BPS_DENOM)
    const rateBps = 500n; // the reserve interest we set for USD (5%)
    const BPS_DENOM = 10000n;
    const principal: bigint = borrowAmount; // ethers.parseUnits returns bigint
    const interest = (principal * rateBps + (BPS_DENOM - 1n)) / BPS_DENOM;
    const totalOwed = principal + interest;

    // Borrower must approve the pool to pull tokens
    await (
      await usd.connect(user1).approve(await pool.getAddress(), totalOwed)
    ).wait();
    // Give user1 some extra USD to cover interest
    await (
      await usd.transfer(await user1.getAddress(), ethers.parseUnits("10", 18))
    ).wait();

    // Now repay (repay() has no args in your contract)
    await (await pool.connect(user1).repay()).wait();

    // Verify loan cleared
    const loanAfter = await pool.loans(await user1.getAddress());
    expect(loanAfter.active).to.equal(false);
    expect(loanAfter.principal).to.equal(0n);
  });
});
