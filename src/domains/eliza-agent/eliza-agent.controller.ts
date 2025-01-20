import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseInterceptors,
  Inject,
  NotFoundException,
  InternalServerErrorException,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { LoggingInterceptor } from '../../shared/interceptors/logging.interceptor';
import { RequireApiKey } from '../../shared/auth/decorators/require-api-key.decorator';
import { CreateElizaAgentDto } from './dtos/eliza-agent.dto';
import { ElizaAgent } from './entities/eliza-agent.entity';
import {
  IElizaAgentCreateService,
  IElizaAgentQueryService,
  IElizaAgentLifecycleService,
  ServiceTokens,
} from './interfaces';

@ApiTags('Eliza Agents')
@Controller('api/eliza-agent')
@UseInterceptors(LoggingInterceptor)
export class ElizaAgentController {
  constructor(
    @Inject(ServiceTokens.ElizaAgentCreate)
    private readonly createService: IElizaAgentCreateService,
    @Inject(ServiceTokens.ElizaAgentQuery)
    private readonly queryService: IElizaAgentQueryService,
    @Inject(ServiceTokens.ElizaAgentLifecycle)
    private readonly lifecycleService: IElizaAgentLifecycleService,
  ) {}

  @Post()
  @RequireApiKey()
  @ApiOperation({ summary: 'Create a new Eliza agent' })
  @ApiResponse({
    status: 201,
    description: 'Agent created successfully',
    type: ElizaAgent,
  })
  async createAgent(@Body() dto: CreateElizaAgentDto) {
    try {
      const agent = await this.createService.createAgent(dto);
      return {
        status: 'success',
        data: {
          agent,
          runtimeInfo: agent.runtimeAgentId
            ? {
                databaseId: agent.id,
                containerId: agent.containerId,
                runtimeAgentId: agent.runtimeAgentId,
              }
            : undefined,
        },
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to create agent: ${error.message}`,
      );
    }
  }

  @Get()
  @RequireApiKey()
  @ApiOperation({ summary: 'List all Eliza agents' })
  @ApiResponse({
    status: 200,
    description: 'List of agents retrieved successfully',
    type: [ElizaAgent],
  })
  async listAgents() {
    const agents = await this.queryService.listAgents();
    return {
      status: 'success',
      data: { agents },
    };
  }

  @Get('running')
  @RequireApiKey()
  @ApiOperation({ summary: 'List all running Eliza agents' })
  @ApiResponse({
    status: 200,
    description: 'List of running agents retrieved successfully',
    type: [ElizaAgent],
  })
  async listRunningAgents() {
    const agents = await this.queryService.listRunningAgents();
    return {
      status: 'success',
      data: { agents },
    };
  }

  @Get('search')
  @RequireApiKey()
  @ApiOperation({ summary: 'Search for Eliza agents by name or token' })
  @ApiResponse({
    status: 200,
    description: 'List of matching agents retrieved successfully',
    type: [ElizaAgent],
  })
  async searchAgents(@Query('term') searchTerm: string) {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return {
        status: 'success',
        data: { agents: [] },
      };
    }

    const agents = await this.queryService.searchAgents(searchTerm);
    return {
      status: 'success',
      data: { agents },
    };
  }

  @Get(':id')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get a specific Eliza agent' })
  @ApiParam({ name: 'id', description: 'Agent Database ID' })
  @ApiResponse({
    status: 200,
    description: 'Agent retrieved successfully',
    type: ElizaAgent,
  })
  async getAgent(@Param('id') id: string) {
    const agent = await this.queryService.getAgent(id);
    if (!agent) {
      throw new NotFoundException(`Agent with ID ${id} not found`);
    }
    return {
      status: 'success',
      data: { agent },
    };
  }

  @Post(':id/start')
  @RequireApiKey()
  @ApiOperation({ summary: 'Start a specific Eliza agent' })
  @ApiParam({ name: 'id', description: 'Agent Database ID' })
  @ApiResponse({ status: 200, description: 'Agent started successfully' })
  async startAgent(@Param('id') id: string) {
    try {
      await this.lifecycleService.startAgent(id);
      return {
        status: 'success',
        message: 'Agent started successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to start agent: ${error.message}`,
      );
    }
  }

  @Post(':id/stop')
  @RequireApiKey()
  @ApiOperation({ summary: 'Stop a specific Eliza agent' })
  @ApiParam({ name: 'id', description: 'Agent Database ID' })
  @ApiResponse({ status: 200, description: 'Agent stopped successfully' })
  async stopAgent(@Param('id') id: string) {
    try {
      await this.lifecycleService.stopAgent(id);
      return {
        status: 'success',
        message: 'Agent stopped successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to stop agent: ${error.message}`,
      );
    }
  }

  @Get('latest')
  @RequireApiKey()
  @ApiOperation({ summary: 'List latest Eliza agents' })
  @ApiResponse({
    status: 200,
    description: 'List of latest agents retrieved successfully',
    type: [ElizaAgent],
  })
  async listLatestAgents() {
    const agents = await this.queryService.listLatestAgents();
    return {
      status: 'success',
      data: { agents },
    };
  }
}
