import { IsNumber, Min, Max, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateAccessCodesDto {
  @ApiProperty({
    description: 'Number of codes to generate',
    minimum: 1,
    maximum: 100,
  })
  @IsNumber()
  @Min(1)
  @Max(100)
  count: number;
}

export class VerifyAccessCodeDto {
  @ApiProperty({ description: 'The 6-character access code to verify' })
  @IsString()
  @Length(6, 6)
  code: string;
}
