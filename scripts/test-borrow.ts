import { ethers } from "hardhat";

async function main() {
    const LENDING_POOL_ADDRESS = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";
    const USD_TOKEN_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"; // From your finalDeploy.ts output
    const [owner] = await ethers.getSigners();

    const lendingPool = await ethers.getContractAt("LendingPool", LENDING_POOL_ADDRESS);
    const usdToken = await ethers.getContractAt("USDToken", USD_TOKEN_ADDRESS);

    const symbol = ethers.encodeBytes32String("USD");
    const amount = ethers.parseUnits("100", 18);

    // 1. Give the LendingPool some money so it can lend it to you
    console.log("Providing liquidity to the pool...");
    await usdToken.approve(LENDING_POOL_ADDRESS, amount);
    await lendingPool.deposit(symbol, amount);
    console.log("Liquidity provided!");

    // 2. Deposit your ETH Collateral
    console.log("Depositing 1 ETH as collateral...");
    const depositTx = await lendingPool.depositCollateral({
        value: ethers.parseEther("1.0")
    });
    await depositTx.wait();

    // 3. Borrow Transaction
    console.log("Sending Borrow Transaction...");
    try {
        const tx = await lendingPool.borrow(
            symbol,
            amount,
            100, // maxSlippage
            0    // expectedPrice (Bypass slippage)
        );

        const receipt = await tx.wait();
        console.log("✅ Transaction Success!");
        console.log("Transaction Hash:", receipt?.hash);
    } catch (error) {
        console.error("❌ Transaction Failed!");
        console.error(error);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});