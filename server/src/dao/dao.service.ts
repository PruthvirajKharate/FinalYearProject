import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proposal } from './enitity/proposal.entity';
import { PROPOSAL_STATUS } from './constant';
import { Vote } from './enitity/vote.entity';

/**
 * Manages the governance lifecycle, including proposal submission, 
 * vote tracking, and status updates.
 */
@Injectable()
export class DaoService {
    constructor(
        @InjectRepository(Proposal)
        private readonly proposalRepository: Repository<Proposal>,
        @InjectRepository(Vote)
        private readonly voteRepository: Repository<Vote>,
    ) { }

    /**
     * Records a new proposal when detected on-chain.
     * @param data - The proposal details from the blockchain event.
     */
    async createProposal(data: Partial<Proposal>): Promise<Proposal> {
        const proposal = this.proposalRepository.create({
            ...data,
            status: PROPOSAL_STATUS.PENDING,
        });
        return await this.proposalRepository.save(proposal);
    }

    /**
     * Updates the status of a proposal (e.g., Active, Succeeded, Executed).
     */
    async updateProposalStatus(id: number, status: PROPOSAL_STATUS): Promise<void> {
        await this.proposalRepository.update(id, { status });
    }

    /**
     * Records an individual vote cast by a user.
     */
    async castVote(data: Partial<Vote>): Promise<Vote> {
        const vote = this.voteRepository.create(data);
        return await this.voteRepository.save(vote);
    }

    /**
     * Fetches all proposals for the DAO dashboard.
     */
    async findAllProposals(): Promise<Proposal[]> {
        return await this.proposalRepository.find({
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * Retrieves all votes cast for a specific proposal.
     */
    async getVotesByProposal(proposalId: number): Promise<Vote[]> {
        return await this.voteRepository.find({ where: { proposalId } });
    }
}