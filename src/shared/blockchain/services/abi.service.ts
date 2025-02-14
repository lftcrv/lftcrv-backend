import { Inject, Injectable } from '@nestjs/common';
import { BlockchainTokens, IAbiService, IProviderService } from '../interfaces';
import { Abi } from 'starknet';

@Injectable()
export class AbiService implements IAbiService {
  constructor(
    @Inject(BlockchainTokens.Provider)
    private readonly providerService: IProviderService,
  ) {}
  private abi: Abi;

  async getAbi(contractAddress: string): Promise<Abi> { // todo stop spamming that, should be called once per contract and stored
    const provider = this.providerService.getProvider();
    const { abi } = await provider.getClassAt(contractAddress);

    return abi;
  }
}
