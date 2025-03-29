import { ApiProperty } from '@nestjs/swagger';
import { AgentStatus, CurveSide } from '@prisma/client';
import { LatestMarketDataDto } from './latest-market-data.dto';

export class ElizaAgentResponseDto {
  @ApiProperty({ description: 'Unique identifier' })
  id: string;

  @ApiProperty({ description: 'Agent name' })
  name: string;

  @ApiProperty({ 
    description: 'Side of the curve',
    enum: CurveSide 
  })
  curveSide: CurveSide;

  @ApiProperty({ description: 'Creator wallet address' })
  creatorWallet: string;

  @ApiProperty({ description: 'Deployment fees transaction hash' })
  deploymentFeesTxHash: string;

  @ApiProperty({ 
    description: 'Current status of the agent',
    enum: AgentStatus 
  })
  status: AgentStatus;

  @ApiProperty({ description: 'Reason for failure if status is FAILED', required: false })
  failureReason?: string;

  @ApiProperty({ description: 'Docker container ID', required: false })
  containerId?: string;

  @ApiProperty({ description: 'Runtime agent ID', required: false })
  runtimeAgentId?: string;

  @ApiProperty({ description: 'Port number the agent is running on', required: false })
  port?: number;

  @ApiProperty({ description: 'Character configuration' })
  characterConfig: any;

  @ApiProperty({ description: 'Profile picture filename', required: false })
  profilePicture?: string;

  @ApiProperty({ description: 'Profile picture URL', required: false })
  profilePictureUrl?: string;

  @ApiProperty({ description: 'Agent creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiProperty({ description: 'Degen score', required: false })
  degenScore?: number;

  @ApiProperty({ description: 'Win score', required: false })
  winScore?: number;

  // Fork relationship fields
  @ApiProperty({ description: 'ID of the agent this was forked from', required: false })
  forkedFromId?: string;

  @ApiProperty({ description: 'Source agent this was forked from', required: false })
  forkedFrom?: ElizaAgentResponseDto;

  @ApiProperty({ 
    description: 'Agents that were forked from this agent',
    type: [ElizaAgentResponseDto],
    required: false
  })
  forks?: ElizaAgentResponseDto[];

  @ApiProperty({ description: 'Latest market data', type: LatestMarketDataDto, required: false })
  latestMarketData?: LatestMarketDataDto;
} 