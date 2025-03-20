import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FundWalletDto {
  @ApiProperty({ description: 'Transaction hash of the successful transfer' })
  @IsString()
  @IsNotEmpty()
  txHash: string;

  @ApiProperty({ description: 'ID of the agent receiving the funds' })
  @IsString()
  @IsNotEmpty()
  runtimeAgentId: string;

  @ApiProperty({
    description: 'Amount (in Wei, ETH, or other) that was transferred',
  })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'Recipient wallet address of the agent' })
  @IsString()
  @IsNotEmpty()
  recipient: string;
}
