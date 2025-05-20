import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateNested,
} from 'class-validator';

export class TokenPriceUpdateBySymbol {
  @ApiProperty({
    description: 'The symbol of the token',
    example: 'BTC',
  })
  @IsString()
  @IsNotEmpty()
  symbol: string;

  @ApiProperty({ description: 'The new price of the token', example: 65000.5 })
  @IsNumber()
  @IsNotEmpty()
  price: number;
}

export class BatchUpdateTokenPriceBySymbolDto {
  @ApiProperty({
    description: 'A list of token symbols with their new prices',
    type: [TokenPriceUpdateBySymbol],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TokenPriceUpdateBySymbol)
  updates: TokenPriceUpdateBySymbol[];
}
