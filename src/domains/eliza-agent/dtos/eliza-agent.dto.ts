import { IsString, IsObject, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CurveSide } from '@prisma/client';

export class CreateElizaAgentDto {
  @ApiProperty({ description: 'Name of the agent' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Curve side for the agent' })
  @IsString()
  @IsNotEmpty()
  curveSide: CurveSide;

  @ApiProperty({ description: 'Character configuration for the agent' })
  @IsObject()
  @IsNotEmpty()
  characterConfig: Record<string, any>;
}
