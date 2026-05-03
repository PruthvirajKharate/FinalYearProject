import { Controller, Get, Param, Query } from '@nestjs/common';
import { TransactionService } from './transaction.service';

@Controller('transaction')
export class TransactionController {
    constructor(private readonly transactionService: TransactionService) {}

    /**
     * GET /transaction/history
     * Returns the global protocol transaction history (all users).
     */
    @Get('history')
    async getGlobalHistory(@Query('limit') limit?: string) {
        const parsedLimit = limit ? parseInt(limit, 10) : 50;
        return await this.transactionService.getGlobalHistory(parsedLimit);
    }

    /**
     * GET /transaction/history/:address
     * Returns the transaction history for a specific user wallet address.
     */
    @Get('history/:address')
    async getUserHistory(
        @Param('address') address: string,
        @Query('limit') limit?: string,
    ) {
        const parsedLimit = limit ? parseInt(limit, 10) : 100;
        return await this.transactionService.getUserHistory(address, parsedLimit);
    }
}
