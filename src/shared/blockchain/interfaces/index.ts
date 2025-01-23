import { IProviderService } from './provider.interface';
import { IAbiService } from './abi.interface';
import { IAccountService } from './account.interface';

export type { IProviderService, IAbiService, IAccountService };

export const BlockchainTokens = {
  Provider: Symbol('IProviderService'),
  Abi: Symbol('IAbiService'),
  Account: Symbol('IAccountService'),
} as const;
