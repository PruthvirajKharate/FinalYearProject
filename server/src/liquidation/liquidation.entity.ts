import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

/**
 * Records the forced closure of a risky loan.
 * Tracks the assets seized from the borrower and the rewards 
 * distributed to the liquidator.
 */
@Entity('liquidations')
export class Liquidation {
    /**
     * Unique identifier for the liquidation record.
     */
    @PrimaryGeneratedColumn()
    id: number;

    /**
     * The ID of the loan that was closed (Relation to Loan table).
     */
    @Column()
    loanId: number;

    /**
     * The address of the borrower whose collateral was seized.
     */
    @Column()
    borrowerAddress: string;

    /**
     * The address of the user who triggered the liquidation.
     */
    @Column()
    liquidatorAddress: string;

    /**
     * The amount of debt (e.g., USD) that the liquidator paid off.
     */
    @Column({
        type: "decimal",
        precision: 36,
        scale: 18
    })
    debtRepaid: string;

    /**
     * The amount of collateral (e.g., ETH) seized by the liquidator.
     */
    @Column({
        type: "decimal",
        precision: 36,
        scale: 18
    })
    collateralSeized: string;

    /**
     * The blockchain transaction hash of the liquidation event.
     */
    @Column()
    txHash: string;

    /**
     * Timestamp of when the liquidation was recorded.
     */
    @CreateDateColumn()
    createdAt: Date;
}