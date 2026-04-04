import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

/**
 * Represents a liquidity pool inside a specific asset in protocol
 * Tracks available supply, interest rates and oracle configurations.
 */
@Entity('reserves')
export class Reserve {
    @PrimaryColumn()
    symbol: string;

    @Column()
    tokenAddress: string;

    @Column()
    priceFeedAddress: string;

    @Column({
        type: "decimal",
        precision: 36,
        scale: 18,
        default: 0
    })
    totalLiquidity: string;

    /**
     * The flat interest rate applied to loans in this reserve, measured in Basis Points.
     * Example: 500 = 5.00%
     */
    @Column({
        type: "integer",
        default: 0
    })
    interestRateBps: number;

    @Column({ default: true })
    isCollateralEnabled: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}