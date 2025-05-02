import {
  PageQueryDto,
  PaginatedResponseDto,
  CreatorDto,
  AgentSummaryDto,
} from '../dtos';

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
}
