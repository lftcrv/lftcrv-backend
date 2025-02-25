import { ApiProperty } from '@nestjs/swagger';
import { WalletAddressType } from '@prisma/client';

export class User {
  @ApiProperty({ description: 'Unique identifier' })
  id: string;

  @ApiProperty({ description: 'Starknet wallet address' })
  starknetAddress: string;

  @ApiProperty({ description: 'EVM wallet address (optional)' })
  evmAddress?: string;

  @ApiProperty({
    description: 'Type of wallet address',
    enum: WalletAddressType,
  })
  addressType: WalletAddressType;

  @ApiProperty({ description: 'Twitter handle (optional)' })
  twitterHandle?: string;

  @ApiProperty({ description: 'Last connection timestamp' })
  lastConnection?: Date;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiProperty({
    description: 'Referral code used during registration (optional)',
  })
  usedReferralCode?: string;
}
