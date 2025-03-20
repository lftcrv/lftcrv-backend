import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RequireApiKey } from '../../../shared/auth/decorators/require-api-key.decorator';
import { FundingService } from './funding.service';
import { FundWalletDto } from './dtos/fund-wallet.dto';

@ApiTags('Funding')
@Controller('api/funding')
export class FundingController {
  constructor(private readonly fundingService: FundingService) {}

  @Post('record')
  @RequireApiKey()
  @ApiOperation({
    summary: 'Record a liquidity deposit after transaction confirmation',
  })
  @ApiResponse({
    status: 201,
    description: 'Liquidity deposit recorded successfully',
  })
  async recordFunding(@Body() body: FundWalletDto) {
    const { txHash, runtimeAgentId, sender, amount } = body;
    const result = await this.fundingService.recordFunding(
      txHash,
      runtimeAgentId,
      sender,
      amount,
    );
    return {
      status: 'success',
      data: result,
    };
  }
}
