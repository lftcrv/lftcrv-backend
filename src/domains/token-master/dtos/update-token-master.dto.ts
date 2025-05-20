import { PartialType, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateTokenMasterDto } from './create-token-master.dto';
import {
  IsNumber,
  IsString,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateTokenMasterDto extends PartialType(CreateTokenMasterDto) {}

export class UpdateTokenPriceDto {
  @ApiPropertyOptional({
    description: 'Unique identifier of the token to update. Must be a UUID.',
    example: 'clxovq6p0000008l3fgh01234',
  })
  @IsString()
  @IsOptional() // Assuming ID might not always be part of an update if route param is used
  id?: string; // Must be a UUID

  @ApiProperty({
    description: 'New price in USD',
    example: 61000.5,
    type: 'number',
    format: 'float',
  })
  @IsNumber()
  priceUSD: number;
}

export class BatchUpdateTokenPriceDto {
  @ApiProperty({ type: [UpdateTokenPriceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => UpdateTokenPriceDto)
  updates: UpdateTokenPriceDto[];
}
