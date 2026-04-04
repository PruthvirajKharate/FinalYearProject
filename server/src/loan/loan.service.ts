import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Loan } from './loan.entity';
import { LOAN_STATUS } from './constants';

/**
 * Manages active debt positions, tracking the lifecycle of a loan 
 * from creation to repayment or liquidation.
 */
@Injectable()
export class LoanService {
    constructor(
        @InjectRepository(Loan)
        private readonly loanRepository: Repository<Loan>,
    ) { }

    /**
     * Creates a new loan record. Called by the Watcher when a 
     * 'Borrowed' event is detected on-chain.
     */
    async createLoan(data: Partial<Loan>): Promise<Loan> {
        const loan = this.loanRepository.create({
            ...data,
            status: LOAN_STATUS.ACTIVE,
        });
        return await this.loanRepository.save(loan);
    }

    /**
     * Updates a loan status to 'Repaid'. 
     * Usually triggered by a 'Repaid' event from the contract.
     */
    async markAsRepaid(loanId: number): Promise<void> {
        await this.loanRepository.update(loanId, {
            status: LOAN_STATUS.REPAID
        });
    }

    /**
     * Marks a loan as 'Liquidated' and links it to the seizure record.
     */
    async markAsLiquidated(loanId: number): Promise<void> {
        await this.loanRepository.update(loanId, {
            status: LOAN_STATUS.LIQUIDATED
        });
    }

    /**
     * Retrieves all active loans for a specific user to display in their dashboard.
     */
    async findActiveLoansByUser(address: string): Promise<Loan[]> {
        return await this.loanRepository.find({
            where: { borrowerAddress: address, status: LOAN_STATUS.ACTIVE },
        });
    }

    /**
 * Finds the current active loan for a borrower and marks it as repaid.
 */
    async markAsRepaidByAddress(borrowerAddress: string): Promise<void> {
        await this.loanRepository.update(
            { borrowerAddress, status: LOAN_STATUS.ACTIVE },
            { status: LOAN_STATUS.REPAID }
        );
    }
}