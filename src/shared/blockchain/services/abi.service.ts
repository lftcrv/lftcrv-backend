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

  async getAbi(contractAddress: string): Promise<Abi> {
    try {
      const provider = this.providerService.getProvider();
      this.logger.log(`Getting ABI for contract: ${contractAddress}`);

      const response = await provider.getClassAt(contractAddress);
      this.logger.debug('Provider response:', response); // Structure complète

      if (!response) {
        this.logger.error(
          `No response from provider for contract ${contractAddress}`,
        );
        throw new Error(
          `No response from provider for contract ${contractAddress}`,
        );
      }

      if (!response.abi) {
        this.logger.error(
          'Response structure:',
          JSON.stringify(response, null, 2),
        );
        throw new Error(
          `No ABI found in response for contract ${contractAddress}`,
        );
      }

      return response.abi;
    } catch (error) {
      this.logger.error(`Error in getAbi for ${contractAddress}:`, error);
      throw error;
    }
  }
}
