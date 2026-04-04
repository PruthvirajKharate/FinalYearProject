import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { LoanService } from '../loan/loan.service';
import { ethers } from 'ethers';
import * as LendingPoolAbi from '../blockchain/LendingPool.json';

@Injectable()
export class LiquidationBotService {
    private readonly logger = new Logger(LiquidationBotService.name);
    private provider: ethers.JsonRpcProvider;
    private wallet: ethers.Wallet;
    private contract: ethers.Contract;
    
    // We fetch configuration securely. If these don't exist via Docker Env, we fallback to the prototype Hardhat details.
    private readonly CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";
    private readonly PRIVATE_KEY = process.env.LIQUIDATOR_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

    constructor(private readonly loanService: LoanService) {
        this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL || "http://127.0.0.1:8545");
        this.wallet = new ethers.Wallet(this.PRIVATE_KEY, this.provider);
        this.contract = new ethers.Contract(this.CONTRACT_ADDRESS, LendingPoolAbi.abi, this.wallet);
    }

    /**
     * Ticks every 10,000 miliseconds (10 seconds)
     */
    @Interval(10000)
    async checkUnderwaterLoans() {
        this.logger.log("[Liquidation Bot] Scanning active collateral positions...");
        
        try {
            const activeLoans = await this.loanService.findAllActiveLoans();
            
            for (const loan of activeLoans) {
                try {
                    // ZERO-GAS VERIFICATION: Instead of running complex chainlink math locally, 
                    // we dynamically pretend to liquidate the borrower on the live blockchain state. 
                    // If it throws exactly "loan healthy", we know they are perfectly fine. 
                    await this.contract.liquidate.staticCall(loan.borrowerAddress);
                    
                    // If staticCall resolves without reverting, the loan is strictly liquidatable!
                    this.logger.warn(`[WARNING] Loan for ${loan.borrowerAddress} is UNDERWATER! Executing auto-liquidation...`);
                    
                    // Fire the real Gas transaction that seizes collateral and pays the bad debt
                    const tx = await this.contract.liquidate(loan.borrowerAddress);
                    await tx.wait();
                    
                    this.logger.log(`[SUCCESS] Bot Execution Hash: ${tx.hash}`);

                    // Database markAsLiquidated operates automatically via the BlockchainWatcher Events System
                } catch (error) {
                    if (error.message && error.message.includes("loan healthy")) {
                        // Position safely over-collateralized.
                        continue;
                    }
                    if (error.message && error.message.includes("ERC20: insufficient allowance")) {
                        this.logger.error(`[CRITICAL] Bot wallet is lacking the required ERC20 Allowance to cover the bad debt for borrower ${loan.borrowerAddress}!`);
                        continue;
                    }
                    // For any other structural issues:
                    this.logger.error(`[Liquidator Error] Failed to evaluate ${loan.borrowerAddress}: ${error.message}`);
                }
            }
        } catch (err) {
            this.logger.error(`[Fatal] Error fetching loans from Postgre: ${err.message}`);
        }
    }
}
