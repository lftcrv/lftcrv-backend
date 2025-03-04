import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({
    description: 'EVM wallet address',
    example: '0xabd7d15dfdf36e077a2c7f3875f75cfe299ecf2e',
    required: false,
  })
  @IsString()
  @IsOptional()
  evmAddress?: string;

  @ApiProperty({
    description: 'Twitter handle',
    example: '@username',
    required: false,
  })
  @IsString()
  @IsOptional()
  twitterHandle?: string;
}
