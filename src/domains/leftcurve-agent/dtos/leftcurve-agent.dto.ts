// dtos/eliza-agent.dto.ts
import {
  IsString,
  IsEnum,
  IsObject,
  IsNotEmpty,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CurveSide } from '@prisma/client';
import { Transform } from 'class-transformer';

export class CreateElizaAgentDto {
  @ApiProperty({
    description: 'Name of the Eliza agent',
    example: 'TraderBot01',
  })
  @IsString()
  @IsNotEmpty()
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
  @IsNotEmpty()
  creatorWallet: string;

  @ApiProperty({
    description: 'Deployment fees tx hash',
  })
  @IsString()
  @IsNotEmpty()
  transactionHash: string;

  @ApiProperty({
    description: 'ID of the agent to fork from (optional)',
    required: false,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsOptional()
  forkedFromId?: string;

  @ApiProperty({
    description: "Agent's character configuration (legacy format)",
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  @IsOptional()
  @Transform(({ value }) => {
    try {
      return typeof value === 'string' ? JSON.parse(value) : value;
    } catch {
      return value;
    }
  })
  characterConfig?: Record<string, any>;

  @ApiProperty({
    description: "Agent's configuration (new format)",
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  @IsOptional()
  @Transform(({ value }) => {
    try {
      return typeof value === 'string' ? JSON.parse(value) : value;
    } catch {
      return value;
    }
  })
  agentConfig?: Record<string, any>;

  // This will be handled by the FileInterceptor
  profilePicture?: string;
}
