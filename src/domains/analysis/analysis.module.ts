import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { ADXService } from './technical/services/adx.service';
import { ATRService } from './technical/services/atr.service';
import { CandlestickService } from './technical/services/candlestick.service';
import { IchimokuService } from './technical/services/ichimoku.service';
import { MomentumService } from './technical/services/momentum.service';
import { MovingAverageService } from './technical/services/moving-average.service';
import { PivotService } from './technical/services/pivot.service';
import { ParadexPriceService } from './technical/services/price/paradex-price.service';
import { VolumeService } from './technical/services/volume.service';
import { TechnicalService } from './technical/technical.service';
import { AvnuPriceService } from './technical/services/price/avnu-price.service';
import { UnifiedPriceService } from './technical/services/price/unified-price.service';
import { KeltnerChannelService } from './technical/services/keltnerChannel.service';

@Module({
  imports: [
    ScheduleModule.forRoot(), // todo, for the cron jobs
  ],
  controllers: [AnalysisController],
  providers: [
    AnalysisService,
    TechnicalService,
    PrismaService,
    // Technical analysis services
    ParadexPriceService,
    AvnuPriceService,
    UnifiedPriceService,
    MovingAverageService,
    CandlestickService,
    MomentumService,
    ADXService,
    ATRService,
    IchimokuService,
    PivotService,
    VolumeService,
    ATRService,
    KeltnerChannelService
  ],
  exports: [AnalysisService, TechnicalService],
})
export class AnalysisModule {}
