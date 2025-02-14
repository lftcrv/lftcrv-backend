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

      const classHash = await provider.getClassHashAt(contractAddress);
      this.logger.log(
        `Class hash for contract ${contractAddress}: ${classHash}`,
      );

      const contractClass = await provider.getClass(classHash);
      this.logger.log('Contract class response:', contractClass);

      if (!contractClass) {
        this.logger.error(`No contract class found for hash ${classHash}`);
        throw new Error(`No contract class found for hash ${classHash}`);
      }

      if (!contractClass.abi) {
        this.logger.error(
          'Contract class structure:',
          JSON.stringify(contractClass, null, 2),
        );
        throw new Error(`No ABI found in contract class for hash ${classHash}`);
      }

      return contractClass.abi;
    } catch (error) {
      this.logger.error(`Error in getAbi for ${contractAddress}:`, error);
      throw error;
    }
  }
}
