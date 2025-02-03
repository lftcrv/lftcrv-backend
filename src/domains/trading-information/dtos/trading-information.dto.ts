import { IsString, IsObject, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TradingInformationDto {
  @ApiProperty({ description: 'Runtime Agent ID' })
  @IsString()
  @IsNotEmpty()
  runtimeAgentId: string; // Just temporary, todo, should be id of db

  @ApiProperty({ description: 'Trading information data' })
  @IsObject()
  @IsNotEmpty()
  information: Record<string, any>;
}
