import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Proposal } from './enitity/proposal.entity';
import { Vote } from './enitity/vote.entity';
import { DaoService } from './dao.service';
import { DaoController } from './dao.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Proposal, Vote])],
    providers: [DaoService],
    controllers: [DaoController],
    exports: [DaoService],
})
export class DaoModule { }