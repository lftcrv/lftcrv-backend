import { ApiProperty } from '@nestjs/swagger';

export class AgentWalletResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  publicKey: string;

  @ApiProperty()
  contractAddress: string;

  @ApiProperty({ required: false })
  deployedAddress?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
