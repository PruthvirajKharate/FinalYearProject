import { Controller, Get, Param } from '@nestjs/common';
import { ReserveService } from './reserve.service';

/**
 * Exposes market data and pool statistics to the frontend.
 */
@Controller('reserves')
export class ReserveController {
    constructor(private readonly reserveService: ReserveService) { }

    /**
     * GET /reserves
     * Returns a list of all supported assets and their current liquidity.
     */
    @Get()
    async getAllReserves() {
        return await this.reserveService.findAll();
    }

    /**
     * GET /reserves/:symbol
     * Returns detailed stats for a specific pool (e.g., USD).
     */
    @Get(':symbol')
    async getReserve(@Param('symbol') symbol: string) {
        return await this.reserveService.findAll(); // Logic to filter by symbol
    }
}