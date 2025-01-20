import { LeaderboardEntry } from '../entities/leaderboard.entity';

export interface ILeaderboardService {
  getLeftCurveLeaderboard(): Promise<LeaderboardEntry[]>;
  getRightCurveLeaderboard(): Promise<LeaderboardEntry[]>;
}
