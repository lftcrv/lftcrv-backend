import {
  IsNumber,
  Min,
  Max,
  IsString,
  Length,
  IsOptional,
  IsDate,
  IsEnum,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AccessCodeType } from '../entities/access-code.entity';
import { Type } from 'class-transformer';

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

// New DTOs for the gated access system
export class GenerateAccessCodeDto {
  @ApiProperty({
    description: 'Type of access code',
    enum: AccessCodeType,
    example: AccessCodeType.REFERRAL,
  })
  @IsEnum(AccessCodeType)
  type: AccessCodeType;

  @ApiProperty({
    description: 'Maximum number of times this code can be used',
    required: false,
    example: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUses?: number;

  @ApiProperty({
    description: 'Expiration date for the code',
    required: false,
    example: '2023-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expiresAt?: Date;

  @ApiProperty({
    description: 'ID of the user who created this code (for referrals)',
    required: false,
  })
  @IsOptional()
  @IsString()
  createdBy?: string;

  @ApiProperty({
    description:
      'Generate a short 6-digit numeric code instead of a long secure code',
    required: false,
    default: false,
    example: true,
  })
  @IsOptional()
  useShortCode?: boolean;

  @ApiProperty({
    description: 'Description or purpose of this access code',
    required: false,
    example: 'Beta access for marketing team',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiProperty({
    description: 'Number of codes to generate with these options',
    required: false,
    default: 1,
    example: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  count?: number;
}

export class ValidateAccessCodeDto {
  @ApiProperty({
    description: 'The access code to validate',
    example: '2a4b6c8d',
  })
  @IsString()
  code: string;

  @ApiProperty({
    description: 'ID of the user attempting to use the code',
  })
  @IsString()
  userId: string;
}

export class AccessCodeIdDto {
  @ApiProperty({
    description: 'ID of the access code',
  })
  @IsUUID()
  id: string;
}
