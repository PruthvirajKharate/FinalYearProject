import { ethers } from "hardhat";

async function main() {
    const [admin, lender, borrower] = await ethers.getSigners();

    // Replace these with your actual deployed addresses from the terminal logs
    const poolAddress = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";
    const usdAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

    const pool = await ethers.getContractAt("LendingPool", poolAddress);
    const usd = await ethers.getContractAt("USDToken", usdAddress);

    console.log("--- Starting Protocol Test ---");

    // Step 0: Fund the Lender (Admin has all the USD initially)
    console.log("Step 0: Funding lender with 50,000 USD...");
    const fundAmount = ethers.parseUnits("50000", 18);
    await usd.connect(admin).transfer(await lender.getAddress(), fundAmount);
    console.log("DONE: Lender funded");

    // Step 1: Lender Deposits 10,000 USD
    const depositAmount = ethers.parseUnits("10000", 18);
    console.log("Step 1: Lender depositing USD...");
    await usd.connect(lender).approve(poolAddress, depositAmount);
    const depositTx = await pool.connect(lender).deposit(
        ethers.encodeBytes32String("USD"),
        depositAmount
    );
    await depositTx.wait();
    console.log("DONE: Deposit recorded in Pool");

    // Step 2: Borrower Deposits 2 ETH as Collateral
    console.log("Step 2: Borrower depositing ETH collateral...");
    const collateralTx = await pool.connect(borrower).depositCollateral({
        value: ethers.parseEther("2.0")
    });
    await collateralTx.wait();
    console.log("DONE: Collateral deposited");

    // Step 3: Borrower Borrows 1,000 USD
    const borrowAmount = ethers.parseUnits("1000", 18);
    console.log("Step 3: Borrower taking a loan...");

    // We pass '0' for expectedEthUsd to bypass the slippage check entirely
    const borrowTx = await pool.connect(borrower).borrow(
        ethers.encodeBytes32String("USD"),
        borrowAmount,
        1000, // 10% max slippage (unused if last arg is 0)
        0     // Setting to 0 skips slippage check in LendingPool.sol
    );
    await borrowTx.wait();
    console.log("DONE: Borrow successful! Loan is now ACTIVE");

    console.log("\n--- Test Complete ---");
    console.log("Check your NestJS terminal to see the automated database updates.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});