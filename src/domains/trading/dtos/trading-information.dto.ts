import { IsString, IsObject, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TradingInformationDto {
  @ApiProperty({ description: 'Id of the agent' })
  @IsString()
  @IsNotEmpty()
  agentId: string;

  @ApiProperty({ description: 'Information about the trade' })
  @IsObject()
  @IsNotEmpty()
  information: Record<string, any>;
}
