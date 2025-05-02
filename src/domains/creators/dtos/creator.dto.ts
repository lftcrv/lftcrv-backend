import { ApiProperty } from '@nestjs/swagger';

export class CreatorDto {
  @ApiProperty({
    example: '0x123abc...',
    description: 'The creator ID (wallet address that created the agent)',
  })
  creatorId: string;

  @ApiProperty({
    example: 5,
    description: 'Number of agents created by this creator',
  })
  agentCount: number;
}
