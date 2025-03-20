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
  @ApiOperation({ summary: 'Poll transaction, then record the funding if successful' })
  @ApiResponse({ status: 201, description: 'Funding recorded successfully' })
  async recordFunding(@Body() body: FundWalletDto) {
    const { txHash, runtimeAgentId, amount } = body;
    const result = await this.fundingService.recordFunding(txHash, runtimeAgentId, amount);
    return {
      status: 'success',
      data: result,
    };
  }
}
