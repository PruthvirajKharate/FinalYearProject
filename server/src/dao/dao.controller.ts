import { Controller, Get, Param } from '@nestjs/common';
import { DaoService } from './dao.service';

/**
 * Exposes DAO governance data to the frontend.
 */
@Controller('dao')
export class DaoController {
    constructor(private readonly daoService: DaoService) { }

    /**
     * GET /dao/proposals
     * Returns a list of all governance proposals.
     */
    @Get('proposals')
    async getProposals() {
        return await this.daoService.findAllProposals();
    }

    /**
     * GET /dao/proposals/:id/votes
     * Returns the voting history for a specific proposal.
     */
    @Get('proposals/:id/votes')
    async getProposalVotes(@Param('id') id: number) {
        return await this.daoService.getVotesByProposal(id);
    }
}