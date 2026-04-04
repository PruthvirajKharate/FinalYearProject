export enum TRANSACTION_TYPE {
    /** Lenders depositing ERC20 simulation fiat into the pool */
    DEPOSIT = "deposit",
    /** Lenders withdrawing their principal + interest */
    WITHDRAW = "withdraw",
    /** Borrowers depositing ETH as collateral for their loans */
    COLLATERAL_DEPOSIT = "collateral_deposit",
    /** Borrowers taking a loan of ERC20 simulator against their collateral */
    BORROW = 'borrow',
    /** Borrowers paying off their active loan entirely */
    REPAY = 'repay',
    /** Automatic or DAO-verified liquidation of an undercollateralized loan */
    LIQUIDATE = 'liquidate',
    /** A DAO or administrator has proposed a high-risk borrower for liquidation */
    PROPOSAL_CREATED = 'proposal_created',
    /** Execution of an approved DAO Liquidation */
    DAO_LIQUIDATION_EXECUTED = 'dao_liquidation_executed'
}

/** Enum mapped directly from Solidity LiquidationType to explain how the position was liquidated */
export enum LIQUIDATION_TYPE {
    AUTOMATIC = 'AUTOMATIC',
    DAO_VERIFIED = 'DAO_VERIFIED'
}