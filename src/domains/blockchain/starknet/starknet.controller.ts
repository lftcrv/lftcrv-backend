import { Controller, Inject, Post, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LoggingInterceptor } from 'src/shared/interceptors/logging.interceptor';
import { IWalletOrchestrator, StarknetTokens } from './interfaces';
import { RequireApiKey } from 'src/shared/auth/decorators/require-api-key.decorator';

@ApiTags('Starknet Blockchain')
@Controller('api/starknet')
@UseInterceptors(LoggingInterceptor)
export class StarknetController {
  constructor(
    @Inject(StarknetTokens.Orchestrator)
    private readonly walletOrchestrator: IWalletOrchestrator,
  ) {}

  @Post('setup')
  @RequireApiKey()
  @ApiOperation({ summary: 'Create, fund and deploy a new wallet' })
  @ApiResponse({
    status: 201,
    description: 'Wallet created, funded and deployed successfully',
  })
  @ApiResponse({
    status: 500,
    description: 'Error during wallet setup process',
  })
  async setupWallet() {
    const wallet = await this.walletOrchestrator.setupWallet();

    return {
      status: 'success',
      data: {
        wallet,
      },
    };
  }
}
