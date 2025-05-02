import { ApiProperty } from '@nestjs/swagger';
import { AgentStatus } from '@prisma/client';

export class AgentSummaryDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'Unique identifier of the agent',
  })
  id: string;

  @ApiProperty({
    example: 'CryptoWhiz',
    description: 'Name of the agent',
  })
  name: string;

  @ApiProperty({
    example: 'RUNNING',
    description: 'Current status of the agent',
    enum: AgentStatus,
  })
  status: AgentStatus;

  @ApiProperty({
    example: '2025-04-28T16:14:50.806Z',
    description: 'Date when the agent was created',
  })
  createdAt: Date;
}
