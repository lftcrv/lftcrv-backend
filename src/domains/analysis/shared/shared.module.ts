import { Module } from '@nestjs/common';
import { ParadexMarketsService } from './services/paradex-markets.service';
import { ParadexMarketsController } from './controllers/paradex-market.controller';
import { PrismaModule } from 'src/shared/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ParadexMarketsController],
  providers: [ParadexMarketsService],
  exports: [ParadexMarketsService],
})
export class AnalysisSharedModule {}
