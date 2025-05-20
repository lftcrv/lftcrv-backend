import { Controller, Get, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { TokenPriceSyncService } from './domains/token-price-sync/token-price-sync.service';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { RequireApiKey } from './shared/auth/decorators/require-api-key.decorator';
import { ApiKeyGuard } from './shared/auth/guards/api-key.guard';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly tokenPriceSyncService: TokenPriceSyncService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('test-sync-prices')
  @RequireApiKey()
  @UseGuards(ApiKeyGuard)
  @ApiExcludeEndpoint()
  async testSyncPrices(): Promise<string> {
    this.tokenPriceSyncService
      .syncPrices()
      .then(() => {
        console.log('Manual testSyncPrices completed via controller.');
      })
      .catch((err) => {
        console.error('Manual testSyncPrices failed via controller:', err);
      });
    return 'Token price sync initiated. Check server logs.';
  }
}
