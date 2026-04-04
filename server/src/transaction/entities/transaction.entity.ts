import { Column, CreateDateColumn, Entity, PrimaryColumn, ManyToOne } from "typeorm";
import { TRANSACTION_TYPE } from "../constants";
import { User } from "src/user/user.entity";

@Entity()
export class Transaction {
    @PrimaryColumn()
    txHash: string;

    @Column({
        type: 'enum',
        enum: TRANSACTION_TYPE,
    })
    type: TRANSACTION_TYPE;

    @Column()
    symbol: String;

    @Column({
        type: 'decimal',
        precision: 36,
        scale: 18
    })
    tokenAmount: string;

    @Column({
        type: 'decimal',
        precision: 36,
        scale: 18
    })
    usdValue: string;

    @ManyToOne(() => User, (user: User) => user.transactions)
    user: User;

    @Column({ type: 'bigint' })
    blockNumber: string;

    @CreateDateColumn()
    createdAt: Date;
}