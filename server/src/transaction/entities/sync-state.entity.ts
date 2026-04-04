import { Entity, PrimaryColumn, Column } from "typeorm";

@Entity()
export class SyncState {
    @PrimaryColumn()
    contractAddress: string;

    @Column({ type: 'bigint', default: 0 })
    lastProcessedBlock: string;
}