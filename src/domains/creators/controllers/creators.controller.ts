import {
  Controller,
  Get,
  Param,
  Query,
  Inject,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { LoggingInterceptor } from '../../../shared/interceptors/logging.interceptor';
import { ICreatorsService, ServiceTokens } from '../interfaces';
import {
  PageQueryDto,
  PaginatedResponseDto,
  CreatorDto,
  AgentSummaryDto,
  CreatorPerformanceSummaryDto,
  LeaderboardQueryDto,
  CreatorLeaderboardEntryDto,
} from '../dtos';
import { RequireApiKey } from '../../../shared/auth/decorators/require-api-key.decorator';

@ApiTags('Creators')
@Controller('api/creators')
@UseInterceptors(LoggingInterceptor)
export class CreatorsController {
  constructor(
    @Inject(ServiceTokens.CreatorsService)
    private readonly creatorsService: ICreatorsService,
  ) {}

  @Get()
  @RequireApiKey()
  @ApiOperation({ summary: 'Get all creators with pagination' })
  @ApiQuery({ type: PageQueryDto })
  @ApiResponse({
    status: 200,
    description: 'List of creators with the count of agents they have created',
    type: () => PaginatedResponseDto,
  })
  async getAllCreators(
    @Query(ValidationPipe) query: PageQueryDto,
  ): Promise<PaginatedResponseDto<CreatorDto>> {
    return this.creatorsService.findAllCreators(query);
  }

  @Get('leaderboard')
  @RequireApiKey()
  @ApiOperation({
    summary: 'Get creator leaderboard ranked by performance metrics',
  })
  @ApiQuery({ type: LeaderboardQueryDto })
  @ApiResponse({
    status: 200,
    description: 'Sorted list of creators with their performance metrics',
    type: () => PaginatedResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'API key is missing or invalid' })
  async getCreatorLeaderboard(
    @Query(ValidationPipe) query: LeaderboardQueryDto,
  ): Promise<PaginatedResponseDto<CreatorLeaderboardEntryDto>> {
    return this.creatorsService.getCreatorLeaderboard(query);
  }

  @Get(':creatorId')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get a specific creator by ID' })
  @ApiParam({
    name: 'creatorId',
    description: 'The creator ID (wallet address)',
    example: '0x123abc...',
  })
  @ApiResponse({
    status: 200,
    description: 'Creator with the count of their agents',
    type: CreatorDto,
  })
  @ApiNotFoundResponse({ description: 'Creator not found' })
  async getCreatorById(
    @Param('creatorId') creatorId: string,
  ): Promise<CreatorDto> {
    return this.creatorsService.findCreatorById(creatorId);
  }

  @Get(':creatorId/agents')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get all agents for a specific creator' })
  @ApiParam({
    name: 'creatorId',
    description: 'The creator ID (wallet address)',
    example: '0x123abc...',
  })
  @ApiQuery({ type: PageQueryDto })
  @ApiResponse({
    status: 200,
    description: 'List of agents created by this creator',
    type: () => PaginatedResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Creator not found' })
  async getAgentsByCreatorId(
    @Param('creatorId') creatorId: string,
    @Query(ValidationPipe) query: PageQueryDto,
  ): Promise<PaginatedResponseDto<AgentSummaryDto>> {
    return this.creatorsService.findAgentsByCreatorId(creatorId, query);
  }

  @Get(':creatorId/performance')
  @RequireApiKey()
  @ApiOperation({
    summary: 'Get aggregated performance summary for a specific creator',
  })
  @ApiParam({
    name: 'creatorId',
    description: 'The creator ID (wallet address)',
    example: '0x123abc...',
  })
  @ApiResponse({
    status: 200,
    description: 'Creator performance summary retrieved successfully',
    type: CreatorPerformanceSummaryDto,
  })
  @ApiNotFoundResponse({
    description: 'Creator not found (no agents associated with this ID)',
  })
  @ApiUnauthorizedResponse({ description: 'API key is missing or invalid' })
  async getCreatorPerformance(
    @Param('creatorId') creatorId: string,
  ): Promise<CreatorPerformanceSummaryDto> {
    return this.creatorsService.getCreatorPerformance(creatorId);
  }
}
