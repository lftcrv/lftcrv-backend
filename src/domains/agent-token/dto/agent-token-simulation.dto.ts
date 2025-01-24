import { ApiProperty } from '@nestjs/swagger';

export class AgentTokenSimulationDto {
  @ApiProperty({
    description: 'Agent Database ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  agentId: string;

  @ApiProperty({
    description: 'Token amount for the operation',
    example: '1000000000000000000',
  })
  tokenAmount: string;
}
