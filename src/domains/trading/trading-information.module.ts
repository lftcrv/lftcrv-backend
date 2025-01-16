import { Module } from '@nestjs/common';
import { TradingInformationTokens } from './interfaces';
import { TradingInformationService } from './services/trading-information.service';
import { TradingInformationController } from './trading-information.controller';

@Module({
  controllers: [TradingInformationController],
  providers: [
    {
      provide: TradingInformationTokens.TradingInformation,
      useClass: TradingInformationService,
    },
  ],
})
export class TradingInformationModule {}
