import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';
import { Transaction } from './entities/transaction.entity';
import { SyncState } from './entities/sync-state.entity';
import { BlockchainWatcherService } from './blockchain-watcher.service';

// --- ADD THESE IMPORTS ---
import { UserModule } from '../user/user.module';
import { LoanModule } from '../loan/loan.module';
import { ReserveModule } from '../reserve/reserve.module';
import { DaoModule } from '../dao/dao.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, SyncState]),
    // Import these so BlockchainWatcherService can access their exported services
    UserModule,
    LoanModule,
    ReserveModule,
    DaoModule,
  ],
  providers: [TransactionService, BlockchainWatcherService],
  controllers: [TransactionController],
  exports: [TransactionService],
})
export class TransactionModule { }