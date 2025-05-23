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
  UploadedFile,
  HttpCode,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MockWalletService } from './services/mock-wallet.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiConsumes,
} from '@nestjs/swagger';
import { LoggingInterceptor } from '../../shared/interceptors/logging.interceptor';
import { RequireApiKey } from '../../shared/auth/decorators/require-api-key.decorator';
import { CreateElizaAgentDto } from './dtos/leftcurve-agent.dto';
import { ElizaAgentResponseDto } from './dtos/eliza-agent-response.dto';
import { AgentCreationResponseDto } from './dtos/agent-creation-response.dto';
import {
  IElizaAgentQueryService,
  IElizaAgentLifecycleService,
  ServiceTokens,
} from './interfaces';
import {
  IOrchestrator,
  OrchestrationServiceTokens,
} from '../orchestration/interfaces';
import { AGENT_CREATION_DEFINITION } from './orchestration/agent-creation.definition';
import { FileUploadService } from './services/file-upload.service';
import { PrismaService } from '../../shared/prisma/prisma.service';

@ApiTags('Eliza Agents')
@Controller('api/eliza-agent')
@UseInterceptors(LoggingInterceptor)
export class ElizaAgentController {
  private readonly logger = new Logger(ElizaAgentController.name);

  constructor(
    @Inject(ServiceTokens.ElizaAgentQuery)
    private readonly queryService: IElizaAgentQueryService,
    @Inject(ServiceTokens.ElizaAgentLifecycle)
    private readonly lifecycleService: IElizaAgentLifecycleService,
    private readonly mockWalletService: MockWalletService,
    @Inject(OrchestrationServiceTokens.Orchestrator)
    private readonly orchestrator: IOrchestrator,
    private readonly fileUploadService: FileUploadService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @HttpCode(202)
  @RequireApiKey()
  @ApiOperation({ summary: 'Initiate creation of a new Eliza agent' })
  @ApiResponse({
    status: 202,
    description: 'Agent creation initiated',
    type: AgentCreationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file type or request data',
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('profilePicture', {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
          callback(
            new BadRequestException(
              'Only image files are allowed (jpg, jpeg, png, gif)',
            ),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  async createAgent(
    @Body() dto: CreateElizaAgentDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<AgentCreationResponseDto> {
    let tempFileName = null;

    try {
      if (dto.characterConfig && !dto.agentConfig) {
        this.logger.log(
          '🔄 Converting legacy characterConfig to new agentConfig format',
        );

        const characterConfig = dto.characterConfig;

        let chatIdSuffix = '';
        if (characterConfig.name) {
          // from the character name
          const nameHash = characterConfig.name
          .split('')
          .reduce((acc, char) => acc + char.charCodeAt(0), 0)
          .toString(16)
          .slice(0, 8);
          chatIdSuffix = nameHash;
        } else {
          // If no name, use timestamp to avoid collisions
          chatIdSuffix = Date.now().toString(16).slice(-8);
        }

        const agentConfig = {
          name: characterConfig.name || dto.name,
          bio: Array.isArray(characterConfig.bio)
            ? characterConfig.bio.join('\n\n')
            : '',
          lore: Array.isArray(characterConfig.lore) ? characterConfig.lore : [],
          objectives: [],
          knowledge: Array.isArray(characterConfig.knowledge)
            ? characterConfig.knowledge
            : [],
          interval: 30,
          analysisPeriod: characterConfig.analysisPeriod,
          chat_id: `chat-${chatIdSuffix}`,
          external_plugins: [],
          internal_plugins: ['leftcurve'],
        };

        if (
          Array.isArray(characterConfig.style?.all) &&
          characterConfig.style.all.length > 0
        ) {
          agentConfig.objectives.push(
            ...characterConfig.style.all.map((s) => `Style: ${s}`),
          );
        }

        dto.agentConfig = agentConfig;
        console.log('✅ Format conversion completed');
      }

      if (!dto.agentConfig && !dto.characterConfig) {
        throw new BadRequestException(
          'Missing agent configuration (agentConfig or characterConfig required)',
        );
      }

      // Handle file upload if present
      if (file) {
        console.log('🔄 Starting temporary file upload process...');
        tempFileName = await this.fileUploadService.uploadTempFile(file);
        console.log('✅ Temporary file uploaded successfully:', tempFileName);
      }

      // Include the temporary filename in the DTO for orchestration
      const orchestrationDto = {
        ...dto,
        profilePicture: tempFileName,
      };

      // Start the orchestration with the updated DTO
      const orchestrationId = await this.orchestrator.startOrchestration(
        AGENT_CREATION_DEFINITION.type,
        orchestrationDto,
      );
      console.log('🚀 Orchestration started:', {
        orchestrationId,
        tempFileName,
      });

      // Get the current orchestration status
      const status =
        await this.orchestrator.getOrchestrationStatus(orchestrationId);

      // Generate mock wallet data
      const mockWallet = this.mockWalletService.createMockWalletData();

      // Update the orchestration status with wallet information
      await this.orchestrator.updateOrchestrationStatus(orchestrationId, {
        metadata: {
          ...status.metadata,
          wallet: mockWallet,
        },
      });

      return {
        status: 'success',
        data: {
          orchestrationId,
          message: 'Agent creation initiated successfully',
        },
      };
    } catch (error) {
      // Log error details
      console.error('❌ Error during agent creation:', {
        error: error.message,
        stack: error.stack,
        fileName: file?.originalname,
        tempFileName,
      });

      // Clean up temporary file if it exists
      if (tempFileName) {
        console.log('🧹 Cleaning up temporary file:', tempFileName);
        await this.fileUploadService.deleteFile(tempFileName, true);
      }

      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to initiate agent creation: ${error.message}`,
      );
    }
  }

  @Get('creation/:orchestrationId')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get the status of an agent creation process' })
  async getCreationStatus(@Param('orchestrationId') orchestrationId: string) {
    try {
      const status =
        await this.orchestrator.getOrchestrationStatus(orchestrationId);

      return {
        status: 'success',
        data: {
          orchestrationStatus: status.status,
          progress: status.progress,
          currentStepId: status.currentStepId,
          result: status.result,
          error: status.error,
        },
      };
    } catch (error) {
      throw new NotFoundException(
        `Creation process ${orchestrationId} not found`,
      );
    }
  }

  @Get('by-transaction')
  @RequireApiKey()
  @ApiOperation({ summary: 'Find an agent by transaction hash' })
  async findByTransaction(
    @Query('transactionHash') transactionHash: string,
    @Query('creatorWallet') creatorWallet?: string,
  ) {
    try {
      console.log('Finding agent by transaction:', {
        transactionHash,
        creatorWallet,
      });

      if (!transactionHash) {
        throw new BadRequestException('Transaction hash is required');
      }

      const query: any = {
        deploymentFeesTxHash: transactionHash,
      };

      if (creatorWallet) {
        query.creatorWallet = creatorWallet;
      }

      const agent = await this.prisma.elizaAgent.findFirst({
        where: query,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          Token: true,
        },
      });

      if (!agent) {
        console.log('No agent found with transaction hash:', transactionHash);
        return {
          status: 'success',
          data: { agent: null },
        };
      }

      console.log('Found agent by transaction:', {
        id: agent.id,
        name: agent.name,
      });

      return {
        status: 'success',
        data: { agent },
      };
    } catch (error) {
      console.error('Error finding agent by transaction:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to find agent: ${error.message}`,
      );
    }
  }

  @Get()
  @RequireApiKey()
  @ApiOperation({ summary: 'List all Eliza agents' })
  @ApiResponse({
    status: 200,
    description: 'List of agents retrieved successfully',
    type: [ElizaAgentResponseDto],
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
    type: [ElizaAgentResponseDto],
  })
  async listRunningAgents() {
    const agents = await this.queryService.listRunningAgents();
    return {
      status: 'success',
      data: { agents },
    };
  }

  @Get('latest')
  @RequireApiKey()
  @ApiOperation({ summary: 'List latest Eliza agents' })
  @ApiResponse({
    status: 200,
    description: 'List of latest agents retrieved successfully',
    type: [ElizaAgentResponseDto],
  })
  async listLatestAgents() {
    const agents = await this.queryService.listLatestAgents();
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
    type: [ElizaAgentResponseDto],
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
    type: ElizaAgentResponseDto,
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

  @Get(':id/avatar')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get agent avatar URL' })
  @ApiResponse({
    status: 200,
    description: 'Avatar URL retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Agent not found or no avatar available',
  })
  async getAgentAvatar(@Param('id') id: string) {
    const agent = await this.queryService.getAgent(id);
    if (!agent.profilePicture) {
      throw new NotFoundException('No avatar found for this agent');
    }
    return {
      url: `/uploads/profile-pictures/${agent.profilePicture}`,
      contentType: 'image/png',
    };
  }
}
