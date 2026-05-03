import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from './entities/transaction.entity';

/**
 * The Ledger Service. It provides a read-only-style audit trail
 * of every significant event on the blockchain.
 */
@Injectable()
export class TransactionService {
    constructor(
        @InjectRepository(Transaction)
        private readonly transactionRepository: Repository<Transaction>,
    ) { }

    /**
     * Records a new transaction hash and its details.
     * This is the 'Write once, read many' part of your DAO.
     */
    async recordTransaction(data: Partial<Transaction>): Promise<Transaction> {
        const tx = this.transactionRepository.create(data);
        return await this.transactionRepository.save(tx);
    }

    /**
     * Fetches the global history for the protocol dashboard.
     */
    async getGlobalHistory(limit: number = 50): Promise<Transaction[]> {
        return await this.transactionRepository.find({
            order: { createdAt: 'DESC' },
            take: limit,
            relations: ['user'], // Includes user details in the history
        });
    }

    /**
     * Fetches the transaction history for a specific user by their wallet address.
     */
    async getUserHistory(publicAddress: string, limit: number = 100): Promise<Transaction[]> {
        return await this.transactionRepository.createQueryBuilder('transaction')
            .leftJoinAndSelect('transaction.user', 'user')
            .where('LOWER(user.publicAddress) = LOWER(:publicAddress)', { publicAddress })
            .orderBy('transaction.createdAt', 'DESC')
            .take(limit)
            .getMany();
    }
}