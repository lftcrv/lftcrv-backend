import { Module } from '@nestjs/common';
import { CandlestickService } from './services/candlestick.service';
import { MomentumService } from './services/momentum.service';
import { MovingAverageService } from './services/moving-average.service';
import { VolumeService } from './services/volume.service';
import { TechnicalService } from './technical.service';
import { TechnicalController } from './technical.controller';
import { PivotService } from './services/pivot.service';
import { ADXService } from './services/adx.service';
import { IchimokuService } from './services/ichimoku.service';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { ParadexPriceService } from './services/price/paradex-price.service';
import { AvnuPriceService } from './services/price/avnu-price.service';
import { UnifiedPriceService } from './services/price/unified-price.service';

@Module({
  imports: [],
  controllers: [TechnicalController],
  providers: [
    TechnicalService,
    PrismaService,
    ParadexPriceService,
    AvnuPriceService,
    UnifiedPriceService,
    MovingAverageService,
    CandlestickService,
    MomentumService,
    ADXService,
    IchimokuService,
    VolumeService,
    PivotService,
  ],
  exports: [TechnicalService],
})
export class TechnicalModule {}
