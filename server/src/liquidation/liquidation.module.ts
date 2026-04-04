import { Module } from '@nestjs/common';
import { LiquidationBotService } from './liquidation-bot.service';
import { LoanModule } from '../loan/loan.module';

@Module({
    imports: [LoanModule],
    providers: [LiquidationBotService],
})
export class LiquidationModule { }
