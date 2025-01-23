import { Global, Module } from '@nestjs/common';
import { ProviderService } from './services/provider.service';
import { BlockchainTokens } from './interfaces';
import { AbiService } from './services/abi.service';
import { AccountService } from './services/account.service';

@Global()
@Module({
  providers: [
    {
      provide: BlockchainTokens.Provider,
      useClass: ProviderService,
    },
    {
      provide: BlockchainTokens.Abi,
      useClass: AbiService,
    },
    {
      provide: BlockchainTokens.Account,
      useClass: AccountService,
    },
  ],
  exports: [
    BlockchainTokens.Provider,
    BlockchainTokens.Abi,
    BlockchainTokens.Account,
  ],
})
export class BlockchainModule {}
