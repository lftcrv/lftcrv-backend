import {
  PageQueryDto,
  PaginatedResponseDto,
  CreatorDto,
  AgentSummaryDto,
  LeaderboardQueryDto,
  CreatorLeaderboardEntryDto,
} from '../dtos';
import { CreatorPerformanceSummaryDto } from '../dtos/creator-performance-summary.dto';

export interface ICreatorsService {
  /**
   * Find all creators with pagination
   */
  findAllCreators(
    query: PageQueryDto,
  ): Promise<PaginatedResponseDto<CreatorDto>>;

  /**
   * Find a specific creator by ID (creatorWallet)
   */
  findCreatorById(creatorId: string): Promise<CreatorDto>;

  /**
   * Find all agents for a specific creator with pagination
   */
  findAgentsByCreatorId(
    creatorId: string,
    query: PageQueryDto,
  ): Promise<PaginatedResponseDto<AgentSummaryDto>>;

  /**
   * Get aggregated performance summary for a specific creator
   */
  getCreatorPerformance(
    creatorId: string,
  ): Promise<CreatorPerformanceSummaryDto>;

  /**
   * Get leaderboard of creators sorted by performance metrics
   */
  getCreatorLeaderboard(
    query: LeaderboardQueryDto,
  ): Promise<PaginatedResponseDto<CreatorLeaderboardEntryDto>>;

  /**
   * Calculate and store leaderboard data for all creators
   * (Used by cron job)
   */
  calculateAndStoreLeaderboard(): Promise<void>;
}
 