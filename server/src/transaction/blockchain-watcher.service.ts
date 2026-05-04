import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ethers } from "ethers";

// ABI and Entity Imports
import * as LendingPoolAbi from "../blockchain/LendingPool.json";
import { SyncState } from "./entities/sync-state.entity";
import { TRANSACTION_TYPE, LIQUIDATION_TYPE } from "./constants";

// Feature Service Imports
import { TransactionService } from "./transaction.service";
import { UserService } from "../user/user.service";
import { LoanService } from "../loan/loan.service";
import { ReserveService } from "../reserve/reserve.service";

@Injectable()
export class BlockchainWatcherService implements OnModuleInit {
    private readonly logger = new Logger(BlockchainWatcherService.name);
    private provider: ethers.JsonRpcProvider;
    private contract: ethers.Contract;
    private readonly CONTRACT_ADDRESS = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";

    constructor(
        private readonly transactionService: TransactionService,
        private readonly userService: UserService,
        private readonly loanService: LoanService,
        private readonly reserveService: ReserveService,
        @InjectRepository(SyncState)
        private readonly syncStateRepo: Repository<SyncState>
    ) {
        this.provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
        this.contract = new ethers.Contract(
            this.CONTRACT_ADDRESS,
            LendingPoolAbi.abi,
            this.provider,
        );
    }

    async onModuleInit() {
        this.logger.log("Initializing Blockchain Watcher...");

        const latestBlock = await this.provider.getBlockNumber();
        const syncState = await this.getSyncState();
        const startBlock = Number(syncState.lastProcessedBlock) + 1;

        if (startBlock <= latestBlock) {
            this.logger.log(`Scanning missed blocks: ${startBlock} to ${latestBlock}`);
            const missedEvents = await this.contract.queryFilter("*", startBlock, latestBlock);

            for (const event of missedEvents) {
                await this.handleEventRouter(event);
            }
        }

        this.listenToEvents();
        await this.updateSyncState(latestBlock);
    }

    private listenToEvents() {
        this.logger.log(`Watching for events on: ${this.CONTRACT_ADDRESS}`);

        this.contract.on("Borrowed", async (...args) => {
            const event = args[args.length - 1];
            await this.handleBorrowedEvent(event);
        });

        this.contract.on("Deposited", async (...args) => {
            const event = args[args.length - 1];
            await this.handleDepositedEvent(event);
        });

        this.contract.on("CollateralDeposited", async (...args) => {
            const event = args[args.length - 1];
            await this.handleCollateralDepositedEvent(event);
        });

        this.contract.on("ReserveAdded", async (...args) => {
            const event = args[args.length - 1];
            await this.handleReserveAddedEvent(event);
        })

        // Repay and Liquidation Events
        this.contract.on("Repaid", async (...args) => {
            const event = args[args.length - 1];
            await this.handleRepaidEvent(event);
        });

        this.contract.on("Liquidated", async (...args) => {
            const event = args[args.length - 1];
            await this.handleLiquidatedEvent(event);
        });

        this.contract.on("DAOLiquidationProposed", async (...args) => {
            const event = args[args.length - 1];
            await this.handleDAOLiquidationProposedEvent(event);
        });
    }

    private async handleEventRouter(event: any) {
        const eventName = event.fragment?.name || event.eventName;

        switch (eventName) {
            case "Borrowed":
                await this.handleBorrowedEvent(event);
                break;
            case "Deposited":
                await this.handleDepositedEvent(event);
                break;
            case "CollateralDeposited":
                await this.handleCollateralDepositedEvent(event);
                break;
            case "ReserveAdded":
                await this.handleReserveAddedEvent(event);
                break;
            case "Repaid":
                await this.handleRepaidEvent(event);
                break;
            case "Liquidated":
                await this.handleLiquidatedEvent(event);
                break;
            case "DAOLiquidationProposed":
                await this.handleDAOLiquidationProposedEvent(event);
                break;
        }
    }

    /**
 * Logic for Reserve Initialization: 
 * Creates the 'Vault' in the database so that 'USD', 'RS', etc. become valid symbols.
 */
    private async handleReserveAddedEvent(event: any) {
        const { symbol, token, priceFeed, rateBps } = event.args;
        const assetSymbol = ethers.decodeBytes32String(symbol);

        try {
            await this.reserveService.createReserve({
                symbol: assetSymbol,
                tokenAddress: token,
                priceFeedAddress: priceFeed,
                interestRateBps: Number(rateBps),
                totalLiquidity: '0',
                isCollateralEnabled: true
            });
            this.logger.log(`[Database] Initialized Reserve: ${assetSymbol}`);
        } catch (err) {
            this.logger.error(`Error in handleReserveAddedEvent: ${err.message}`);
        }
    }

    private async handleBorrowedEvent(event: any) {
        // Matches Solidity: event Borrowed(address indexed borrower, bytes32 indexed symbol, uint256 amount, uint256 collateral);
        const { borrower, symbol, amount, collateral } = event.args;
        const assetSymbol = ethers.decodeBytes32String(symbol);
        const amountFormatted = ethers.formatUnits(amount, 18);
        const txHash = event.log?.transactionHash || event.transactionHash;

        try {
            await this.userService.findOrCreateUser(borrower);

            // Inside handleBorrowedEvent
            await this.loanService.createLoan({
                borrowerAddress: borrower,
                assetSymbol,
                principalAmount: amountFormatted,
                collateralAmount: ethers.formatUnits(collateral || 0, 18),
                // Match the entity definition exactly:
                loanTimeStamp: Date.now().toString(),
            });

            await this.reserveService.updateLiquidity(assetSymbol, amountFormatted, false);

            await this.transactionService.recordTransaction({
                txHash,
                type: TRANSACTION_TYPE.BORROW,
                symbol: assetSymbol,
                tokenAmount: amountFormatted,
                usdValue: amountFormatted,
                user: { publicAddress: borrower } as any,
                blockNumber: (event.log?.blockNumber || event.blockNumber).toString()
            });
        } catch (err) {
            this.logger.error(`Error in handleBorrowedEvent: ${err.message}`);
            require('fs').appendFileSync('borrow_error.log', `Error in handleBorrowedEvent: ${err.stack}\n`);
        }
    }

    private async handleDepositedEvent(event: any) {
        // Matches Solidity: event Deposited(address indexed lender, bytes32 indexed symbol, uint256 amount);
        const { lender, symbol, amount } = event.args;
        const assetSymbol = ethers.decodeBytes32String(symbol);
        const amountFormatted = ethers.formatUnits(amount, 18);
        const txHash = event.log?.transactionHash || event.transactionHash;

        try {
            // Use 'lender' instead of 'user' to match Solidity event
            await this.userService.findOrCreateUser(lender);

            await this.reserveService.updateLiquidity(assetSymbol, amountFormatted, true);

            await this.transactionService.recordTransaction({
                txHash,
                type: TRANSACTION_TYPE.DEPOSIT,
                symbol: assetSymbol,
                tokenAmount: amountFormatted,
                usdValue: amountFormatted,
                user: { publicAddress: lender } as any,
                blockNumber: (event.log?.blockNumber || event.blockNumber).toString()
            });
        } catch (err) {
            this.logger.error(`Error in handleDepositedEvent: ${err.message}`);
        }
    }

    private async handleCollateralDepositedEvent(event: any) {
        // Matches Solidity: event CollateralDeposited(address indexed user, uint256 amount);
        const { user, amount } = event.args;
        const amountFormatted = ethers.formatUnits(amount, 18);
        const txHash = event.log?.transactionHash || event.transactionHash;

        try {
            await this.userService.findOrCreateUser(user);

            await this.transactionService.recordTransaction({
                txHash,
                type: TRANSACTION_TYPE.COLLATERAL_DEPOSIT,
                symbol: 'ETH',
                tokenAmount: amountFormatted,
                usdValue: (Number(amountFormatted) * 2000).toString(),
                user: { publicAddress: user } as any,
                blockNumber: (event.log?.blockNumber || event.blockNumber).toString()
            });
            this.logger.log(`[Event] CollateralDeposited: ${user} deposited ${amountFormatted} ETH`);
        } catch (err) {
            this.logger.error(`Error in handleCollateralDepositedEvent: ${err.message}`);
        }
    }

    /**
     * Handles the Repaid event indicating a borrower has paid back their loan.
     */
    private async handleRepaidEvent(event: any) {
        // event Repaid(address indexed borrower, bytes32 indexed symbol, uint256 repaid, uint256 interest);
        const { borrower, symbol, repaid, interest } = event.args;
        const assetSymbol = ethers.decodeBytes32String(symbol);
        const repaidFormatted = ethers.formatUnits(repaid, 18);
        const txHash = event.log?.transactionHash || event.transactionHash;

        try {
            await this.loanService.markAsRepaidByAddress(borrower);
            await this.reserveService.updateLiquidity(assetSymbol, repaidFormatted, true);

            await this.transactionService.recordTransaction({
                txHash,
                type: TRANSACTION_TYPE.REPAY,
                symbol: assetSymbol,
                tokenAmount: repaidFormatted,
                usdValue: repaidFormatted,
                user: { publicAddress: borrower } as any,
                blockNumber: (event.log?.blockNumber || event.blockNumber).toString()
            });
            this.logger.log(`[Event] Repaid: ${borrower} repaid ${repaidFormatted} ${assetSymbol}`);
        } catch (err) {
            this.logger.error(`Error in handleRepaidEvent: ${err.message}`);
        }
    }

    /**
     * Handles the Liquidated event tracking loan defaults and liquidator actions
     */
    private async handleLiquidatedEvent(event: any) {
        // event Liquidated(address indexed borrower, address indexed liquidator, uint256 seizedCollateral, LiquidationType liquidationType);
        const { borrower, liquidator, seizedCollateral, liquidationType } = event.args;

        const seizedFormatted = ethers.formatUnits(seizedCollateral, 18);
        const txHash = event.log?.transactionHash || event.transactionHash;

        // LiquidationType mapping: 0 = AUTOMATIC, 1 = DAO_VERIFIED
        const mappedLiqType = liquidationType === 0n ? LIQUIDATION_TYPE.AUTOMATIC : LIQUIDATION_TYPE.DAO_VERIFIED;

        try {
            await this.userService.findOrCreateUser(liquidator);
            await this.loanService.markAsLiquidatedByAddress(borrower);

            await this.transactionService.recordTransaction({
                txHash,
                type: mappedLiqType === LIQUIDATION_TYPE.DAO_VERIFIED ? TRANSACTION_TYPE.DAO_LIQUIDATION_EXECUTED : TRANSACTION_TYPE.LIQUIDATE,
                symbol: 'ETH', // seized collateral is ETH
                tokenAmount: seizedFormatted,
                usdValue: '0',
                user: { publicAddress: borrower } as any,
                blockNumber: (event.log?.blockNumber || event.blockNumber).toString()
            });
            this.logger.log(`[Event] Liquidated: ${borrower} by ${liquidator} (${mappedLiqType})`);
        } catch (err) {
            this.logger.error(`Error in handleLiquidatedEvent: ${err.message}`);
        }
    }

    /**
     * Tracks proposals flagged by DAOs
     */
    private async handleDAOLiquidationProposedEvent(event: any) {
        // event DAOLiquidationProposed(address indexed borrower, address indexed proposer);
        const { borrower, proposer } = event.args;
        const txHash = event.log?.transactionHash || event.transactionHash;

        try {
            await this.transactionService.recordTransaction({
                txHash,
                type: TRANSACTION_TYPE.PROPOSAL_CREATED,
                symbol: 'N/A',
                tokenAmount: '0',
                usdValue: '0',
                user: { publicAddress: proposer } as any,
                blockNumber: (event.log?.blockNumber || event.blockNumber).toString()
            });
            this.logger.log(`[Event] DAO Proposal Created for liquidating: ${borrower} by ${proposer}`);
        } catch (err) {
            this.logger.error(`Error in handleDAOLiquidationProposedEvent: ${err.message}`);
        }
    }

    private async getSyncState(): Promise<SyncState> {
        let state = await this.syncStateRepo.findOne({
            where: { contractAddress: this.CONTRACT_ADDRESS }
        });

        if (!state) {
            state = await this.syncStateRepo.save(
                this.syncStateRepo.create({
                    contractAddress: this.CONTRACT_ADDRESS,
                    lastProcessedBlock: "0",
                })
            );
        }
        return state;
    }

    private async updateSyncState(blockNumber: number | bigint) {
        await this.syncStateRepo.update(
            { contractAddress: this.CONTRACT_ADDRESS },
            { lastProcessedBlock: blockNumber.toString() }
        );
    }
}