import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Provider, RpcProvider } from 'starknet';
import { IProviderService } from '../interfaces/provider.interface';

@Injectable()
export class ProviderService implements IProviderService, OnModuleInit {
  private provider: Provider;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.provider = new RpcProvider({
      nodeUrl: this.configService.get<string>('STARKNET_RPC_URL'),
    });
  }

  getProvider(): Provider {
    return this.provider;
  }
}
