// dtos/eliza-agent.dto.ts
import { IsString, IsEnum, IsObject, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CurveSide } from '@prisma/client';

export class CreateElizaAgentDto {
  @ApiProperty({
    description: 'Name of the Eliza agent',
    example: 'TraderBot01',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Side of the curve',
    enum: CurveSide,
    example: CurveSide.LEFT,
  })
  @IsEnum(CurveSide)
  curveSide: CurveSide;

  @ApiProperty({
    description: 'Wallet address of the creator',
    example: 'Ox1234567890',
  })
  @IsString()
  creatorWallet: string;

  @ApiProperty({
    description: 'Deployment fees tx hash',
  })
  @IsString()
  transactionHash: string;

  @ApiProperty({ description: 'Character configuration for the agent' })
  @IsObject()
  @IsNotEmpty()
  characterConfig: Record<string, any>;
}
