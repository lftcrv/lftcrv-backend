import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, Matches } from 'class-validator';
import { WalletAddressType } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({
    description: 'Starknet wallet address',
    example:
      '0x65837757b2a9525eb820d4d5781a8d1bae43a8c0a81cc9e640b3522cd2e012e5',
  })
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{1,64}$/, {
    message: 'Invalid Starknet address format',
  })
  starknetAddress: string;

  @ApiProperty({
    description: 'EVM wallet address (optional)',
    example: '0xabd7d15dfdf36e077a2c7f3875f75cfe299ecf2e',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Matches(/^0x[a-fA-F0-9]{40}$/, {
    message: 'Invalid EVM address format',
  })
  evmAddress?: string;

  @ApiProperty({
    description: 'Type of wallet address',
    enum: WalletAddressType,
    example: 'NATIVE',
  })
  @IsEnum(WalletAddressType)
  addressType: WalletAddressType;

  @ApiProperty({
    description: 'Twitter handle (optional)',
    example: '@username',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Matches(/^@[A-Za-z0-9_]{1,15}$/, {
    message: 'Invalid Twitter handle format',
  })
  twitterHandle?: string;

  @ApiProperty({
    description: 'Access/Referral code used for registration',
    example: 'CODE123',
    required: false,
  })
  @IsString()
  @IsOptional()
  accessCode?: string;
}
