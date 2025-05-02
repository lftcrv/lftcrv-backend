import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { ICreatorsService } from '../interfaces';
import { 
  PageQueryDto, 
  PaginatedResponseDto, 
  CreatorDto, 
  AgentSummaryDto 
} from '../dtos';

@Injectable()
export class CreatorsService implements ICreatorsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllCreators(query: PageQueryDto): Promise<PaginatedResponseDto<CreatorDto>> {
    const { page, limit } = query;
    const skip = (page - 1) * limit;
    const take = limit;

    // Get creators with count of agents
    const creatorsWithCount = await this.prisma.elizaAgent.groupBy({
      by: ['creatorWallet'],
      _count: {
        id: true,
      },
      skip,
      take,
      orderBy: {
        creatorWallet: 'asc', // Required for pagination to work with groupBy
      },
    });

    // Get total count of unique creators
    const totalCreatorsCount = await this.prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*) as count FROM (
        SELECT "creatorWallet" FROM "eliza_agents"
        GROUP BY "creatorWallet"
      ) as creators
    `;

    const total = Number(totalCreatorsCount[0]?.count || 0);

    // Map to CreatorDto
    const creators = creatorsWithCount.map((creator) => ({
      creatorId: creator.creatorWallet,
      agentCount: creator._count.id,
    }));

    const response = new PaginatedResponseDto<CreatorDto>();
    response.data = creators;
    response.total = total;
    response.page = page;
    response.limit = limit;
    
    return response;
  }

  async findCreatorById(creatorId: string): Promise<CreatorDto> {
    const agentCount = await this.prisma.elizaAgent.count({
      where: {
        creatorWallet: creatorId,
      },
    });

    if (agentCount === 0) {
      throw new NotFoundException(`Creator with ID ${creatorId} not found`);
    }

    return {
      creatorId,
      agentCount,
    };
  }

  async findAgentsByCreatorId(
    creatorId: string,
    query: PageQueryDto,
  ): Promise<PaginatedResponseDto<AgentSummaryDto>> {
    const { page, limit } = query;
    const skip = (page - 1) * limit;
    const take = limit;

    // First verify creator exists
    const creatorExists = await this.prisma.elizaAgent.findFirst({
      where: {
        creatorWallet: creatorId,
      },
      select: {
        creatorWallet: true,
      },
    });

    if (!creatorExists) {
      throw new NotFoundException(`Creator with ID ${creatorId} not found`);
    }

    // Get agents for creator with pagination
    const agents = await this.prisma.elizaAgent.findMany({
      where: {
        creatorWallet: creatorId,
      },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
      },
      skip,
      take,
      orderBy: {
        createdAt: 'desc', // Most recent first
      },
    });

    // Get total count of agents for this creator
    const total = await this.prisma.elizaAgent.count({
      where: {
        creatorWallet: creatorId,
      },
    });

    const response = new PaginatedResponseDto<AgentSummaryDto>();
    response.data = agents;
    response.total = total;
    response.page = page;
    response.limit = limit;
    
    return response;
  }
} 