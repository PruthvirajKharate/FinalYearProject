import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { PROPOSAL_STATUS } from "../constant";

/**
 * Represents a governance action submitted by a user with 
 * sufficient voting power to change protocol parameters.
 */
@Entity('proposals')
export class Proposal {
    /**
     * Unique ID of the proposal, matching the ID on the blockchain.
     */
    @PrimaryGeneratedColumn()
    id: number;

    /**
     * The address of the user who created the proposal.
     */
    @Column()
    proposerAddress: string;

    /**
     * A brief, descriptive title for the governance action.
     */
    @Column()
    title: string;

    /**
     * Detailed explanation of why this change is being proposed.
     */
    @Column({ type: 'text' })
    description: string;

    /**
     * The current state of the proposal in the governance lifecycle.
     */
    @Column({
        type: 'enum',
        enum: PROPOSAL_STATUS,
        default: PROPOSAL_STATUS.PENDING
    })
    status: PROPOSAL_STATUS;

    /**
     * The blockchain block number where voting begins.
     */
    @Column({ type: 'bigint' })
    startBlock: string;

    /**
     * The blockchain block number where voting concludes.
     */
    @Column({ type: 'bigint' })
    endBlock: string;

    /**
     * The timestamp when the proposal was synchronized.
     */
    @CreateDateColumn()
    createdAt: Date;

    /**
     * Updated when the proposal status changes (e.g., Succeeded, Executed).
     */
    @UpdateDateColumn()
    updatedAt: Date;
}