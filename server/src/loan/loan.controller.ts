import { Controller, Get, Param } from '@nestjs/common';
import { LoanService } from './loan.service';

/**
 * Exposes loan data and debt tracking to the frontend.
 */
@Controller('loans')
export class LoanController {
    constructor(private readonly loanService: LoanService) { }

    /**
     * GET /loans/active
     * Returns ALL active loans across all users (used by the Liquidation dashboard).
     */
    @Get('active')
    async getAllActiveLoans() {
        return await this.loanService.findAllActiveLoans();
    }

    /**
     * GET /loans/active/:address
     * Fetches all current unpaid loans for a specific user.
     */
    @Get('active/:address')
    async getActiveLoans(@Param('address') address: string) {
        return await this.loanService.findActiveLoansByUser(address);
    }
}