import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Import Modular Features
import { UserModule } from './user/user.module';
import { ReserveModule } from './reserve/reserve.module';
import { LoanModule } from './loan/loan.module';
import { TransactionModule } from './transaction/transaction.module';
import { DaoModule } from './dao/dao.module';

/**
 * The Root Module of the application.
 * Responsibilities:
 * 1. Initialize Database Connection (TypeORM).
 * 2. Orchestrate Feature Modules (User, Reserve, Loan, etc.).
 */
@Module({
  imports: [
    /**
     * Database configuration for PostgreSQL.
     * 'autoLoadEntities' is critical for your modular pattern as it 
     * automatically detects .entity.ts files in all subdirectories.
     */
    TypeOrmModule.forRoot({
      type: "postgres",
      host: process.env.DATABASE_HOST || "localhost",
      port: process.env.DATABASE_PORT ? parseInt(process.env.DATABASE_PORT) : 5432,
      username: process.env.DATABASE_USER || "root",
      password: process.env.DATABASE_PASSWORD || "root",
      database: process.env.DATABASE_NAME || "lending_db",
      synchronize: true, // Auto-syncs database schema with entities
      autoLoadEntities: true,
    }),

    // Registering your Modular directories
    UserModule,
    ReserveModule,
    LoanModule,
    TransactionModule,
    DaoModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }