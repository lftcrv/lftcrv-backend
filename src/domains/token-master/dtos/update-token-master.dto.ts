import { PartialType, ApiProperty } from '@nestjs/swagger';
import { CreateTokenMasterDto } from './create-token-master.dto';
import {
  IsNumber,
  IsString,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateTokenMasterDto extends PartialType(CreateTokenMasterDto) {}

export class UpdateTokenPriceDto {
  @ApiProperty({
    description:
      'Identifier for the token (UUID, or contractAddress-chainID string)',
    example: 'clxovq6p0000008l3fgh01234', // or "0x123abc-ethereum"
  })
  @IsString()
  id: string; // Can be UUID or a composite key like contractAddress-chainID

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
