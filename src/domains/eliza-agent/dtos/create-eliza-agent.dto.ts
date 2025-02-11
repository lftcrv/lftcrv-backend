import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsObject, IsEnum } from 'class-validator';
import { CurveSide } from '@prisma/client';

export class CreateElizaAgentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: CurveSide })
  @IsEnum(CurveSide)
  curveSide: CurveSide;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  creatorWallet: string;

  @ApiProperty({
    description: 'Confirmed L2 transaction hash for deployment payment',
  })
  @IsString()
  @IsNotEmpty()
  transactionHash: string;

  @ApiProperty()
  @IsObject()
  characterConfig: Record<string, any>;
}
