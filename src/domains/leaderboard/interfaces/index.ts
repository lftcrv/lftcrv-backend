import { ILeaderboardService } from './leaderboard.interface';

export type { ILeaderboardService };

export const LeaderboardTokens = {
  Service: Symbol('ILeaderboardService'),
} as const;
