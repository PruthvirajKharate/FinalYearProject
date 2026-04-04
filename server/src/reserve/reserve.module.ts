import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reserve } from './reserve.entity';
import { ReserveService } from './reserve.service';
import { ReserveController } from './reserve.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Reserve])],
    providers: [ReserveService],
    controllers: [ReserveController],
    exports: [ReserveService],
})
export class ReserveModule { }