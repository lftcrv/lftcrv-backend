import { IsString, IsNotEmpty, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FundWalletDto {
  @ApiProperty({ description: 'Transaction hash of the successful transfer' })
  @IsString()
  @IsNotEmpty()
  txHash: string;

  @ApiProperty({ description: 'Runtime agent ID receiving the liquidity' })
  @IsString()
  @IsNotEmpty()
  runtimeAgentId: string;

  @ApiProperty({ description: 'Sender address of the transaction' })
  @IsString()
  @IsNotEmpty()
  sender: string;

  @ApiProperty({ description: 'Amount of USDC transferred (in smallest unit)' })
  @IsNumber()
  amount: number;
}
