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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { LoggingInterceptor } from '../../shared/interceptors/logging.interceptor';
import { RequireApiKey } from '../../shared/auth/decorators/require-api-key.decorator';
import { CreateElizaAgentDto } from './dtos/eliza-agent.dto';
import { ElizaAgent } from './entities/eliza-agent.entity';
import { IElizaAgentService } from './interfaces/eliza-agent-service.interface';

@ApiTags('Eliza Agents')
@Controller('api/eliza-agent')
@UseInterceptors(LoggingInterceptor)
export class ElizaAgentController {
  constructor(
    @Inject('IElizaAgentService')
    private readonly elizaAgentService: IElizaAgentService,
  ) {}

  @Post()
  @RequireApiKey()
  @ApiOperation({ summary: 'Create a new Eliza agent' })
  @ApiResponse({
    status: 201,
    description: 'Agent created successfully. Returns database ID, container ID, and runtime ID when available',
    type: ElizaAgent,
  })
  @ApiResponse({ status: 400, description: 'Invalid configuration provided' })
  async createAgent(@Body() dto: CreateElizaAgentDto) {
    try {
      const agent = await this.elizaAgentService.createAgent(dto);
      return {
        status: 'success',
        data: { 
          agent,
          runtimeInfo: agent.runtimeAgentId ? {
            databaseId: agent.id,
            containerId: agent.containerId,
            runtimeAgentId: agent.runtimeAgentId
          } : undefined
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
    const agents = await this.elizaAgentService.listAgents();
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
    const agents = await this.elizaAgentService.listRunningAgents();
    return {
      status: 'success',
      data: { agents },
    };
  }

  @Get(':id') // databaseID of the agent
  @RequireApiKey()
  @ApiOperation({ summary: 'Get a specific Eliza agent' })
  @ApiParam({ name: 'id', description: 'Agent Database ID' })
  @ApiResponse({
    status: 200,
    description: 'Agent retrieved successfully',
    type: ElizaAgent,
  })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  async getAgent(@Param('id') id: string) {
    const agent = await this.elizaAgentService.getAgent(id);
    if (!agent) {
      throw new NotFoundException(`Agent with ID ${id} not found`);
    }
    return {
      status: 'success',
      data: { agent },
    };
  }

  @Post(':id/start') // databaseID of the agent
  @RequireApiKey()
  @ApiOperation({ summary: 'Start a specific Eliza agent' })
  @ApiParam({ name: 'id', description: 'Agent Database ID' })
  @ApiResponse({ status: 200, description: 'Agent started successfully' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  async startAgent(@Param('id') id: string) {
    try {
      await this.elizaAgentService.startAgent(id);
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

  @Post(':id/stop') // databaseID of the agent
  @RequireApiKey()
  @ApiOperation({ summary: 'Stop a specific Eliza agent' })
  @ApiParam({ name: 'id', description: 'Agent Database ID' })
  @ApiResponse({ status: 200, description: 'Agent stopped successfully' })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  async stopAgent(@Param('id') id: string) {
    try {
      await this.elizaAgentService.stopAgent(id);
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
}
