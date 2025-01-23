import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Account } from 'starknet';
import { IAccountService } from '../interfaces/account.interface';
import { BlockchainTokens, IProviderService } from '../interfaces';

@Injectable()
export class AccountService implements IAccountService, OnModuleInit {
  private adminAccount: Account;

  constructor(
    private readonly configService: ConfigService,
    @Inject(BlockchainTokens.Provider)
    private readonly providerService: IProviderService,
  ) {}

  onModuleInit() {
    const provider = this.providerService.getProvider();

    const privateKey = this.configService.get('ADMIN_WALLET_PK');
    const accountAddress = this.configService.get('ADMIN_WALLET_ADDRESS');

    this.adminAccount = new Account(provider, accountAddress, privateKey);
  }

  getAdminAccount(): Account {
    return this.adminAccount;
  }
}
