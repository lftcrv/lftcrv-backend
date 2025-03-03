import { Inject, Injectable, Logger } from '@nestjs/common';
import { BlockchainTokens, IAbiService, IProviderService } from '../interfaces';
import { Abi } from 'starknet';

@Injectable()
export class AbiService implements IAbiService {
  private readonly logger = new Logger(AbiService.name);
  constructor(
    @Inject(BlockchainTokens.Provider)
    private readonly providerService: IProviderService,
  ) {}
  private abi: Abi;

  async getAbi(contractAddress: string): Promise<Abi> {
    this.logger.debug('calling ABI..');
    const provider = this.providerService.getProvider();
    const { abi } = await provider.getClassAt(contractAddress);

    return abi;
  }
}
