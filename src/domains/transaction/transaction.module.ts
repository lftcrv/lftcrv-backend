import { Module } from '@nestjs/common';
import { TransactionTokens } from './interfaces';
import { TransactionService } from './services/transaction.service';
import { TransactionController } from './transaction.controller';

@Module({
  controllers: [TransactionController],
  providers: [
    {
      provide: TransactionTokens.Service,
      useClass: TransactionService,
    },
  ],
  exports: [TransactionTokens.Service],
})
export class TransactionModule {}
