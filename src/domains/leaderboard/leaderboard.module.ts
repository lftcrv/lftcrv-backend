import { Module } from '@nestjs/common';
import { LeaderboardTokens } from './interfaces';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './service/leaderboard.service';

@Module({
  controllers: [LeaderboardController],
  providers: [
    {
      provide: LeaderboardTokens.Service,
      useClass: LeaderboardService,
    },
  ],
  exports: [LeaderboardTokens.Service], // Export the service if needed by other modules
})
export class LeaderboardModule {}
