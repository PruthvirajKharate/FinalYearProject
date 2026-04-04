import { Column, CreateDateColumn, Entity, OneToMany, PrimaryColumn } from "typeorm";
import { USER_ROLES } from "./constant";
import { Transaction } from "src/transaction/entities/transaction.entity";

/**
 * Represents a unique member participating in Lending Protocol and DAO.
 * Identified by user blockchain public address.
 */
@Entity('users')
export class User {
    /**
     * Public Address of user acts as Primary Key for user related data.
     */
    @PrimaryColumn()
    publicAddress: String;

    @Column({
        type: 'enum',
        enum: USER_ROLES,
        default: USER_ROLES.USER
    })
    role: USER_ROLES;

    @Column({
        type: "decimal",
        precision: 36,
        scale: 18,
        default: '0'
    })
    votingPower: string;

    @OneToMany(() => Transaction, (transaction) => transaction.user)
    transactions: Transaction[];

    @CreateDateColumn()
    createdAt: Date;
}