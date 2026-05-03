const { ethers } = require("hardhat");

async function main() {
    const CONTRACT_ADDRESS = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";
    const LENDING_POOL_ABI = require("./frontend/src/blockchain/LendingPool.json").abi;
    
    // Connect to local hardhat network
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const signer = await provider.getSigner();

    const pool = new ethers.Contract(CONTRACT_ADDRESS, LENDING_POOL_ABI, signer);

    // Deposit collateral
    console.log("Depositing collateral...");
    await (await pool.depositCollateral({ value: ethers.parseEther("1.0") })).wait();

    // Borrow USD
    console.log("Borrowing USD...");
    const symbol = ethers.encodeBytes32String("USD");
    const amount = ethers.parseUnits("10", 18);
    // maxPriceSlippageBps = 500, expectedEthUsd = 0 (to bypass check)
    await (await pool.borrow(symbol, amount, 500, 0)).wait();

    console.log("Borrow complete");
}

main().catch(console.error);
