import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

/**
 * A record of a single vote cast by a user on a specific proposal.
 */
@Entity('votes')
export class Vote {
    @PrimaryGeneratedColumn()
    id: number;

    /**
     * Link to the proposal being voted on.
     */
    @Column()
    proposalId: number;

    /**
     * The address of the voter.
     */
    @Column()
    voterAddress: string;

    /**
     * Whether the user supports (true), opposes (false), or abstains.
     * Often represented as an integer in smart contracts (0=Against, 1=For, 2=Abstain).
     */
    @Column({ type: 'integer' })
    support: number;

    /**
     * The amount of voting power the user held at the time the vote was cast.
     */
    @Column({ type: 'decimal', precision: 36, scale: 18 })
    weight: string;

    /**
     * Transaction hash of the vote for auditability.
     */
    @Column()
    txHash: string;

    @CreateDateColumn()
    createdAt: Date;
}