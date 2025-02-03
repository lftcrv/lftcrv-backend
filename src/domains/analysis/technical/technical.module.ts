import { Module } from '@nestjs/common';
import { CandlestickService } from './services/candlestick.service';
import { MomentumService } from './services/momentum.service';
import { MovingAverageService } from './services/moving-average.service';
import { PriceService } from './services/price.service';
// import { SupportResistanceService } from './services/support-resistance.service';
import { VolumeService } from './services/volume.service';
import { TechnicalService } from './technical.service';
import { TechnicalController } from './technical.controller';
import { PivotService } from './services/pivot.service';
import { ADXService } from './services/adx.service';
import { IchimokuService } from './services/ichimoku.service';

@Module({
  imports: [],
  controllers: [TechnicalController],
  providers: [
    TechnicalService,
    PriceService,
    MovingAverageService,
    CandlestickService,
    MomentumService,
    ADXService,
    IchimokuService,
    VolumeService,
    PivotService,
    // SupportResistanceService
  ],
  exports: [TechnicalService],
})
export class TechnicalModule {}
