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

  async getAbi(contractAddress: string): Promise<Abi> {
    const provider = this.providerService.getProvider();
    const response = await provider.getClassAt(contractAddress);
    console.log('Provider response:', response);

    if (!response) {
      throw new Error(`No response from provider for contract ${contractAddress}`);
    }

    if (!response.abi) {
      console.log('Full response structure:', JSON.stringify(response, null, 2));
      throw new Error(`No ABI found in response for contract ${contractAddress}`);
    }

    return response.abi;
  }
}
