import { IsString, IsObject, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateElizaAgentDto {
  @ApiProperty({ description: 'Name of the agent' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Character configuration for the agent' })
  @IsObject()
  @IsNotEmpty()
  characterConfig: Record<string, any>;
}
