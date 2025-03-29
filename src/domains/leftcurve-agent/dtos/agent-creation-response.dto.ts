import { ApiProperty } from '@nestjs/swagger';

export class ForkDetailsDto {
  @ApiProperty({
    description: 'ID of the source agent this was forked from',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  sourceAgentId: string;

  @ApiProperty({
    description: 'Name of the source agent',
    example: 'TradingBot123'
  })
  sourceAgentName: string;
}

export class AgentCreationDataDto {
  @ApiProperty({
    description: 'Orchestration ID for tracking the creation process',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  orchestrationId: string;

  @ApiProperty({
    description: 'Status message',
    example: 'Agent creation initiated successfully'
  })
  message: string;

  @ApiProperty({
    description: 'Fork details if agent was forked',
    type: ForkDetailsDto,
    required: false
  })
  forkDetails?: ForkDetailsDto;
}

export class AgentCreationResponseDto {
  @ApiProperty({
    description: 'Status of the API request',
    example: 'success'
  })
  status: string;

  @ApiProperty({
    description: 'Response data',
    type: AgentCreationDataDto
  })
  data: AgentCreationDataDto;
} 