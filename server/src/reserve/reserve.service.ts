import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reserve } from './reserve.entity';

/**
 * Manages the state of liquidity pools, including total supply, 
 * interest rates, and asset-specific configurations.
 */
@Injectable()
export class ReserveService {
    constructor(
        @InjectRepository(Reserve)
        private readonly reserveRepository: Repository<Reserve>,
    ) { }

    /**
 * Creates a new reserve entry. 
 * Invoked by the Watcher when 'ReserveAdded' is detected on-chain.
 */
    async createReserve(data: Partial<Reserve>): Promise<Reserve> {
        // Check if it already exists to prevent duplicate errors during re-syncs
        const existing = await this.reserveRepository.findOne({ where: { symbol: data.symbol } });
        if (existing) return existing;

        const reserve = this.reserveRepository.create(data);
        return await this.reserveRepository.save(reserve);
    }

    async updateLiquidity(symbol: string, amount: string, isIncrease: boolean): Promise<void> {
        const reserve = await this.reserveRepository.findOne({ where: { symbol } });
        if (!reserve) throw new NotFoundException(`Reserve ${symbol} not found`);

        const sign = isIncrease ? '+' : '-';
        const parsedAmount = parseFloat(amount);

        // Uses an atomic SQL update to prevent race conditions during rapid event consumption
        await this.reserveRepository
            .createQueryBuilder()
            .update(Reserve)
            .set({
                totalLiquidity: () => `"totalLiquidity" ${sign} ${parsedAmount}`
            })
            .where("symbol = :symbol", { symbol })
            .execute();
    }

    /**
     * Syncs the latest USD price for an asset from the Oracle.
     */
    async updatePrice(symbol: string, newPrice: string): Promise<void> {
        await this.reserveRepository.update({ symbol }, { totalLiquidity: newPrice });
        // Note: In a production app, you might move price to a separate Oracle table 
        // but for the MVP, updating the Reserve's reference price is efficient.
    }

    /**
     * Fetches all active reserves for the frontend dashboard.
     */
    async findAll(): Promise<Reserve[]> {
        return await this.reserveRepository.find();
    }
}