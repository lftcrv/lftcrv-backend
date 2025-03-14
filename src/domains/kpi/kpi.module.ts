import { Module } from '@nestjs/common';
import { KPIController } from './kpi.controller';
import { KPIService } from './services/kpi.service';
import { AccountBalanceTokens } from './interfaces';

@Module({
  controllers: [KPIController],
  providers: [
    {
      provide: AccountBalanceTokens.AccountBalance,
      useClass: KPIService,
    },
  ],
})
export class KPIModule {}
