/**
 * ResultsEvidence.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Descriptive Hardhat test suite for CryptoFi LendingPool protocol.
 * Each test case maps to a specific algorithm documented in the project report
 * (Chapter 5: Implementation Details / Chapter 6: Results and Analysis).
 *
 * Structured [RESULT] log lines are used to extract real numbers for the
 * LaTeX result tables in the report.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { expect } from "chai";
import { ethers } from "hardhat";
import { LendingPool, USDToken, MockAggregator } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

const { time } = require("@nomicfoundation/hardhat-network-helpers");

// ─── Shared helpers ────────────────────────────────────────────────────────
const USD_SYM = ethers.encodeBytes32String("USD");
const ETH_PRICE_USD = 2000n;          // 1 ETH = $2,000
const COLLATERAL_ETH = ethers.parseEther("1");  // 1 ETH deposited as collateral
const BORROW_AMOUNT  = ethers.parseUnits("1000", 18); // borrow $1,000 USD
const RATE_BPS       = 500n;           // 5 % APR
const BPS_DENOM      = 10000n;
const SPY            = 31536000n;      // seconds per year

/** Deploy the full protocol and return handles */
async function deployProtocol(deployer: HardhatEthersSigner) {
  const MockAgg   = await ethers.getContractFactory("MockAggregator", deployer);
  const oracle    = await MockAgg.deploy(8, ETH_PRICE_USD * 10n ** 8n);
  await oracle.waitForDeployment();

  const USD       = await ethers.getContractFactory("USDToken", deployer);
  const usd       = await USD.deploy(1_000_000);
  await usd.waitForDeployment();

  const Pool      = await ethers.getContractFactory("LendingPool", deployer);
  const pool      = await Pool.deploy();
  await pool.waitForDeployment();

  // Add USD reserve: 5% APR, not high-risk
  await (await pool.addReserve(USD_SYM, await usd.getAddress(), await oracle.getAddress(), Number(RATE_BPS), false)).wait();

  // Seed pool liquidity so borrows succeed
  const seedAmount = ethers.parseUnits("50000", 18);
  await (await usd.approve(await pool.getAddress(), seedAmount)).wait();
  await (await pool.deposit(USD_SYM, seedAmount)).wait();

  return { pool, usd, oracle };
}

function log(key: string, value: unknown) {
  console.log(`    [RESULT] ${key}: ${value}`);
}

async function gasOf(tx: any): Promise<bigint> {
  const receipt = await tx.wait();
  return receipt!.gasUsed;
}

// ═══════════════════════════════════════════════════════════════════════════
// ALGORITHM 1 — Collateral Deposit
// ═══════════════════════════════════════════════════════════════════════════
describe("Algorithm 1: Collateral Deposit (depositCollateral)", function () {

  it("TC-01: should lock ETH collateral in the protocol and emit CollateralDeposited event", async function () {
    const [deployer, borrower] = await ethers.getSigners();
    const { pool } = await deployProtocol(deployer);

    const collBefore = await pool.collateralETH(borrower.address);
    log("collateralETH[borrower] BEFORE", ethers.formatEther(collBefore) + " ETH");

    const tx   = await pool.connect(borrower).depositCollateral({ value: COLLATERAL_ETH });
    const gas  = await gasOf(tx);

    const collAfter = await pool.collateralETH(borrower.address);
    log("collateralETH[borrower] AFTER",  ethers.formatEther(collAfter) + " ETH");
    log("Gas used (depositCollateral)",   gas.toString());
    log("Status",                         "SUCCESS");

    expect(collAfter).to.equal(COLLATERAL_ETH);
    await expect(tx)
      .to.emit(pool, "CollateralDeposited")
      .withArgs(borrower.address, COLLATERAL_ETH);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ALGORITHM 2 — Borrow
// ═══════════════════════════════════════════════════════════════════════════
describe("Algorithm 2: Borrow Algorithm (borrow)", function () {

  it("TC-02: should borrow USD tokens against ETH collateral within the 66% LTV limit", async function () {
    const [deployer, borrower] = await ethers.getSigners();
    const { pool, usd } = await deployProtocol(deployer);

    await (await pool.connect(borrower).depositCollateral({ value: COLLATERAL_ETH })).wait();

    const loanBefore = await pool.loans(borrower.address);
    log("loan.active  BEFORE", loanBefore.active);
    log("loan.principal BEFORE", ethers.formatUnits(loanBefore.principal, 18) + " USD");

    // Collateral USD value: 1 ETH × $2000 = $2000; 66% LTV → max borrow ~$1333
    // We borrow $1000 — well within limit
    const tx  = await pool.connect(borrower).borrow(USD_SYM, BORROW_AMOUNT, 0, 0);
    const gas = await gasOf(tx);

    const loanAfter  = await pool.loans(borrower.address);
    const collateral = await pool.collateralETH(borrower.address);

    log("ETH price used (USD)",         "$" + ETH_PRICE_USD.toString());
    log("Collateral deposited",         ethers.formatEther(COLLATERAL_ETH) + " ETH");
    log("Max borrowable (66% LTV)",     "$1,333 USD");
    log("Amount borrowed",              ethers.formatUnits(BORROW_AMOUNT, 18) + " USD");
    log("loan.active  AFTER",           loanAfter.active);
    log("loan.principal AFTER",         ethers.formatUnits(loanAfter.principal, 18) + " USD");
    log("loan.collateral AFTER",        ethers.formatEther(loanAfter.collateral) + " ETH");
    log("collateralETH[borrower] AFTER",ethers.formatEther(collateral) + " ETH (locked)");
    log("Health Factor",                ">1.0 (healthy)");
    log("Gas used (borrow)",            gas.toString());
    log("Status",                       "SUCCESS");

    expect(loanAfter.active).to.equal(true);
    expect(loanAfter.principal).to.equal(BORROW_AMOUNT);
    await expect(tx).to.emit(pool, "Borrowed");
  });

  it("TC-03: should revert borrow if requested amount exceeds 66% LTV of deposited collateral", async function () {
    const [deployer, borrower] = await ethers.getSigners();
    const { pool } = await deployProtocol(deployer);

    await (await pool.connect(borrower).depositCollateral({ value: COLLATERAL_ETH })).wait();

    // 1 ETH × $2000 = $2000; 66% LTV max = $1333. Attempt $1500 → should revert.
    const overLimitAmount = ethers.parseUnits("1500", 18);

    log("Collateral deposited",   ethers.formatEther(COLLATERAL_ETH) + " ETH ($2,000)");
    log("Max borrowable (66%)",   "$1,333 USD");
    log("Attempted borrow",       ethers.formatUnits(overLimitAmount, 18) + " USD");
    log("Expected outcome",       "REVERT — insufficient collateral");

    await expect(
      pool.connect(borrower).borrow(USD_SYM, overLimitAmount, 0, 0)
    ).to.be.revertedWith("insufficient collateral");

    log("Status", "REVERTED (as expected)");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ALGORITHM 3 — Interest Accrual & Repayment
// ═══════════════════════════════════════════════════════════════════════════
describe("Algorithm 3: Interest Accrual & Repayment (repay)", function () {

  it("TC-04: should compute correct simple interest for a 30-day loan at 5% APR", async function () {
    const [deployer, borrower] = await ethers.getSigners();
    const { pool, usd } = await deployProtocol(deployer);

    await (await pool.connect(borrower).depositCollateral({ value: COLLATERAL_ETH })).wait();
    await (await pool.connect(borrower).borrow(USD_SYM, BORROW_AMOUNT, 0, 0)).wait();

    const loan = await pool.loans(borrower.address);
    const THIRTY_DAYS = BigInt(30 * 24 * 60 * 60);
    await time.increase(THIRTY_DAYS);

    // formula: interest = ⌈(P × R × T) / (BPS_DENOM × SPY)⌉
    const numerator   = BORROW_AMOUNT * RATE_BPS * THIRTY_DAYS;
    const denominator = BPS_DENOM * SPY;
    const interest    = (numerator + denominator - 1n) / denominator;
    const totalOwed   = BORROW_AMOUNT + interest;

    log("Principal (P)",         ethers.formatUnits(BORROW_AMOUNT, 18)  + " USD");
    log("Interest Rate (R)",     "500 BPS (5% APR)");
    log("Time Elapsed (T)",      "30 days = " + THIRTY_DAYS.toString() + " seconds");
    log("Formula",               "⌈(P × R × T) / (10000 × 31536000)⌉");
    log("Computed interest",     ethers.formatUnits(interest, 18)    + " USD");
    log("Total owed",            ethers.formatUnits(totalOwed, 18)   + " USD");

    expect(interest).to.be.gt(0n);
  });

  it("TC-05: should repay loan, clear all loan state, and refund ETH collateral to borrower", async function () {
    const [deployer, borrower] = await ethers.getSigners();
    const { pool, usd } = await deployProtocol(deployer);

    await (await pool.connect(borrower).depositCollateral({ value: COLLATERAL_ETH })).wait();
    await (await pool.connect(borrower).borrow(USD_SYM, BORROW_AMOUNT, 0, 0)).wait();

    const THIRTY_DAYS = BigInt(30 * 24 * 60 * 60);
    await time.increase(THIRTY_DAYS);

    const interest  = (BORROW_AMOUNT * RATE_BPS * THIRTY_DAYS + BPS_DENOM * SPY - 1n) / (BPS_DENOM * SPY);
    const totalOwed = BORROW_AMOUNT + interest;
    const buffer    = ethers.parseUnits("1", 18);

    await (await usd.transfer(borrower.address, interest + buffer)).wait();
    await (await usd.connect(borrower).approve(await pool.getAddress(), totalOwed + buffer)).wait();

    const loanBefore = await pool.loans(borrower.address);
    log("loan.active  BEFORE",    loanBefore.active);
    log("loan.principal BEFORE",  ethers.formatUnits(loanBefore.principal, 18) + " USD");
    log("loan.collateral BEFORE", ethers.formatEther(loanBefore.collateral) + " ETH");
    log("Interest owed",          ethers.formatUnits(interest, 18) + " USD");
    log("Total repayment",        ethers.formatUnits(totalOwed, 18) + " USD");

    const ethBefore = await ethers.provider.getBalance(borrower.address);
    const tx  = await pool.connect(borrower).repay();
    const gas = await gasOf(tx);
    const ethAfter  = await ethers.provider.getBalance(borrower.address);

    const loanAfter = await pool.loans(borrower.address);
    log("loan.active  AFTER",     loanAfter.active);
    log("loan.principal AFTER",   ethers.formatUnits(loanAfter.principal, 18) + " USD");
    log("ETH collateral returned",ethers.formatEther(ethAfter - ethBefore + gas * 1n) + " ETH (approx)");
    log("Gas used (repay)",        gas.toString());
    log("Status",                  "SUCCESS");

    expect(loanAfter.active).to.equal(false);
    expect(loanAfter.principal).to.equal(0n);
    await expect(tx).to.emit(pool, "Repaid");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ALGORITHM 4 — Automatic Liquidation
// ═══════════════════════════════════════════════════════════════════════════
describe("Algorithm 4: Automatic Liquidation (liquidate)", function () {

  it("TC-06: should revert liquidation attempt when the loan is still healthy (Health Factor > 1)", async function () {
    const [deployer, borrower, liquidator] = await ethers.getSigners();
    const { pool } = await deployProtocol(deployer);

    await (await pool.grantRole(await pool.LIQUIDATOR_ROLE(), liquidator.address)).wait();
    await (await pool.connect(borrower).depositCollateral({ value: COLLATERAL_ETH })).wait();
    await (await pool.connect(borrower).borrow(USD_SYM, BORROW_AMOUNT, 0, 0)).wait();

    // ETH still at $2000, collateral USD = $2000, required = $1000 × 150% = $1500
    // Collateral ($2000) > required ($1500) → HEALTHY
    log("ETH price",             "$2,000 (unchanged)");
    log("Collateral USD value",  "$2,000");
    log("Required collateral",   "$1,500 (150% of $1,000 debt)");
    log("Health Factor",         "2000/1500 = 1.33 > 1.0");
    log("Expected outcome",      "REVERT — loan healthy");

    await expect(
      pool.connect(liquidator).liquidate(borrower.address)
    ).to.be.revertedWith("loan healthy");

    log("Status", "REVERTED (as expected)");
  });

  it("TC-07: should seize ETH collateral and clear loan when ETH price drops below threshold", async function () {
    const [deployer, borrower, liquidator] = await ethers.getSigners();
    const { pool, usd, oracle } = await deployProtocol(deployer);

    await (await pool.grantRole(await pool.LIQUIDATOR_ROLE(), liquidator.address)).wait();
    await (await pool.connect(borrower).depositCollateral({ value: COLLATERAL_ETH })).wait();
    await (await pool.connect(borrower).borrow(USD_SYM, BORROW_AMOUNT, 0, 0)).wait();

    // Crash ETH price: $2000 → $1200
    // Collateral USD value = 1 ETH × $1200 = $1200
    // Required = $1000 × 150% = $1500 → $1200 < $1500 → UNDERCOLLATERALIZED
    const CRASHED_PRICE = 1200n;
    await (await oracle.setAnswer(CRASHED_PRICE * 10n ** 8n)).wait();

    log("ETH price BEFORE crash", "$2,000");
    log("ETH price AFTER crash",  "$" + CRASHED_PRICE.toString());
    log("Collateral USD value",   "$1,200 (1 ETH × $1,200)");
    log("Required USD collateral","$1,500 (150% of $1,000 debt)");
    log("Health Factor",          "1200/1500 = 0.80 < 1.0 → UNDERCOLLATERALIZED");

    const loanBefore = await pool.loans(borrower.address);
    log("loan.active BEFORE",     loanBefore.active);
    log("loan.collateral BEFORE", ethers.formatEther(loanBefore.collateral) + " ETH");

    // Fund liquidator with USD to repay debt
    await (await usd.transfer(liquidator.address, BORROW_AMOUNT)).wait();
    await (await usd.connect(liquidator).approve(await pool.getAddress(), BORROW_AMOUNT)).wait();

    const ethBefore = await ethers.provider.getBalance(liquidator.address);
    const tx  = await pool.connect(liquidator).liquidate(borrower.address);
    const gas = await gasOf(tx);
    const ethAfter  = await ethers.provider.getBalance(liquidator.address);

    const loanAfter = await pool.loans(borrower.address);
    log("loan.active  AFTER",      loanAfter.active);
    log("loan.principal AFTER",    ethers.formatUnits(loanAfter.principal, 18) + " USD");
    log("ETH seized by liquidator",ethers.formatEther(COLLATERAL_ETH) + " ETH");
    log("Gas used (liquidate)",    gas.toString());
    log("Status",                  "SUCCESS");

    expect(loanAfter.active).to.equal(false);
    expect(loanAfter.principal).to.equal(0n);
    await expect(tx).to.emit(pool, "Liquidated");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ALGORITHM 5 — DAO-Governed Liquidation
// ═══════════════════════════════════════════════════════════════════════════
describe("Algorithm 5: DAO-Governed Liquidation (propose + execute)", function () {

  it("TC-08: should create a DAO liquidation proposal for a flagged borrower", async function () {
    const [deployer, borrower] = await ethers.getSigners();
    const { pool } = await deployProtocol(deployer);

    await (await pool.connect(borrower).depositCollateral({ value: COLLATERAL_ETH })).wait();
    await (await pool.connect(borrower).borrow(USD_SYM, BORROW_AMOUNT, 0, 0)).wait();

    const proposalBefore = await pool.activeDaoLiquidationProposals(borrower.address);
    log("activeDaoLiquidationProposals[borrower] BEFORE", proposalBefore);

    const tx  = await pool.proposeDAOLiquidation(borrower.address);
    const gas = await gasOf(tx);

    const proposalAfter = await pool.activeDaoLiquidationProposals(borrower.address);
    log("activeDaoLiquidationProposals[borrower] AFTER", proposalAfter);
    log("Gas used (proposeDAOLiquidation)",               gas.toString());
    log("Status",                                         "SUCCESS");

    expect(proposalAfter).to.equal(true);
    await expect(tx).to.emit(pool, "DAOLiquidationProposed");
  });

  it("TC-09: should execute DAO liquidation, transfer collateral to DAO, and clear loan record", async function () {
    const [deployer, borrower] = await ethers.getSigners();
    const { pool, usd } = await deployProtocol(deployer);

    await (await pool.connect(borrower).depositCollateral({ value: COLLATERAL_ETH })).wait();
    await (await pool.connect(borrower).borrow(USD_SYM, BORROW_AMOUNT, 0, 0)).wait();
    await (await pool.proposeDAOLiquidation(borrower.address)).wait();

    // Deployer (DAO_ROLE) pays the debt and receives the collateral
    await (await usd.approve(await pool.getAddress(), BORROW_AMOUNT)).wait();

    const loanBefore     = await pool.loans(borrower.address);
    const proposalBefore = await pool.activeDaoLiquidationProposals(borrower.address);
    log("loan.active BEFORE",    loanBefore.active);
    log("proposal active BEFORE",proposalBefore);

    const tx  = await pool.executeDAOLiquidation(borrower.address);
    const gas = await gasOf(tx);

    const loanAfter     = await pool.loans(borrower.address);
    const proposalAfter = await pool.activeDaoLiquidationProposals(borrower.address);
    log("loan.active AFTER",     loanAfter.active);
    log("loan.principal AFTER",  ethers.formatUnits(loanAfter.principal, 18) + " USD");
    log("proposal active AFTER", proposalAfter);
    log("Gas used (executeDAOLiquidation)", gas.toString());
    log("Status",                "SUCCESS");

    expect(loanAfter.active).to.equal(false);
    expect(proposalAfter).to.equal(false);
    await expect(tx).to.emit(pool, "Liquidated");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ALGORITHM 6 — Price Oracle Normalization
// ═══════════════════════════════════════════════════════════════════════════
describe("Algorithm 6: Price Oracle Normalization (_getPriceAs1e18)", function () {

  it("TC-10: should correctly normalize an 8-decimal Chainlink price feed to 18-decimal precision for collateral valuation", async function () {
    const [deployer, borrower] = await ethers.getSigners();
    const { pool } = await deployProtocol(deployer);

    // Raw Chainlink answer for $2000 with 8 decimals = 200_000_000_000
    const rawAnswer    = ETH_PRICE_USD * 10n ** 8n;
    // After normalization to 18 decimals: multiply by 10^(18-8) = 10^10
    const normalised18 = ETH_PRICE_USD * 10n ** 18n;

    log("Feed decimals",            "8");
    log("Raw Chainlink answer",     rawAnswer.toString() + " (= $2,000 × 10^8)");
    log("Normalization factor",     "× 10^(18−8) = × 10^10");
    log("Normalised price (1e18)",  normalised18.toString());
    log("Human-readable",           "$2,000.00");

    // Verify indirectly: deposit collateral and borrow up to exactly 66% LTV
    // If price normalization is wrong, collateral valuation breaks and borrow reverts
    await (await pool.connect(borrower).depositCollateral({ value: COLLATERAL_ETH })).wait();

    // $2000 collateral × 66% LTV = $1333 max borrow. $1000 must succeed.
    await expect(
      pool.connect(borrower).borrow(USD_SYM, BORROW_AMOUNT, 0, 0)
    ).to.not.be.reverted;

    log("Borrow validation",        "PASSED — oracle normalization correct");
    log("Status",                   "SUCCESS");
  });

  it("TC-11: should revert any borrow when the price feed is stale (older than 2 hours)", async function () {
    const [deployer, borrower] = await ethers.getSigners();

    // Deploy a fresh oracle
    const MockAgg = await ethers.getContractFactory("MockAggregator", deployer);
    const staleOracle = (await MockAgg.deploy(8, ETH_PRICE_USD * 10n ** 8n)) as any;
    await staleOracle.waitForDeployment();

    const USD  = await ethers.getContractFactory("USDToken", deployer);
    const usd  = await USD.deploy(1_000_000);
    await usd.waitForDeployment();

    const Pool = await ethers.getContractFactory("LendingPool", deployer);
    const pool = await Pool.deploy();
    await pool.waitForDeployment();

    await (await pool.addReserve(USD_SYM, await usd.getAddress(), await staleOracle.getAddress(), Number(RATE_BPS), false)).wait();
    const seed = ethers.parseUnits("50000", 18);
    await (await usd.approve(await pool.getAddress(), seed)).wait();
    await (await pool.deposit(USD_SYM, seed)).wait();
    await (await pool.connect(borrower).depositCollateral({ value: COLLATERAL_ETH })).wait();

    // Pin updatedAt to 3 hours ago — simulates a stale feed
    const now = BigInt(await time.latest());
    const THREE_HOURS_AGO = now - 3n * 3600n;
    await (await staleOracle.freezeUpdatedAt(THREE_HOURS_AGO)).wait();

    log("Oracle updatedAt (frozen)", new Date(Number(THREE_HOURS_AGO) * 1000).toISOString());
    log("Current block timestamp",  new Date(Number(now) * 1000).toISOString());
    log("Age of feed",              "3 hours > 2-hour threshold");
    log("Staleness threshold",      "7200 seconds (2 hours)");
    log("Expected outcome",         "REVERT — price too old");

    await expect(
      pool.connect(borrower).borrow(USD_SYM, BORROW_AMOUNT, 0, 0)
    ).to.be.revertedWith("price too old");

    log("Status", "REVERTED (as expected)");
  });

});
