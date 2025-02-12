import { Module } from '@nestjs/common';
import { LeaderboardController } from './leaderboard.controller';

@Module({
  controllers: [LeaderboardController],
})
export class LeaderboardModule {}
