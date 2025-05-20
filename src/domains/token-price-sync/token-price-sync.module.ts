import { Module, Logger } from '@nestjs/common';
// import { HttpModule } from '@nestjs/axios'; // Removed
import { ConfigModule } from '@nestjs/config';
import { TokenPriceSyncService } from './token-price-sync.service';

@Module({
  imports: [
    ConfigModule, // Ensure ConfigService is available
    // HttpModule is no longer needed here as axios is used directly in the service
  ],
  providers: [TokenPriceSyncService, Logger], 
  exports: [TokenPriceSyncService],
})
export class TokenPriceSyncModule {} 