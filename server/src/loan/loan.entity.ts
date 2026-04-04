import { Column, CreateDateColumn, DeleteDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { LOAN_STATUS } from "./constants";

@Entity('loans')
export class Loan {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    assetSymbol: string;

    @Column()
    borrowerAddress: string;

    @Column({ type: "decimal", precision: 36, scale: 18 })
    collateralAmount: string;

    @Column({
        type: "decimal",
        precision: 36,
        scale: 18
    })
    principalAmount: string;

    @Column({
        type: 'enum',
        enum: LOAN_STATUS,
        default: LOAN_STATUS.ACTIVE
    })
    status: LOAN_STATUS;

    @Column({ type: 'bigint' })
    loanTimeStamp: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}