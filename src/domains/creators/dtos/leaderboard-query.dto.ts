import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum LeaderboardSortField {
  BALANCE = 'balance',
  PNL_CYCLE = 'pnlCycle',
  PNL_24H = 'pnl24h',
  RUNNING_AGENTS = 'runningAgents',
}

export class LeaderboardQueryDto {
  @ApiProperty({
    description: 'Page number (starts at 1)',
    example: 1,
    default: 1,
    required: false,
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
    default: 10,
    required: false,
  })
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 10;

  @ApiProperty({
    description: 'Field to sort by',
    enum: LeaderboardSortField,
    default: LeaderboardSortField.PNL_CYCLE,
    required: false,
  })
  @IsEnum(LeaderboardSortField)
  @IsOptional()
  sortBy?: LeaderboardSortField = LeaderboardSortField.PNL_CYCLE;
}
