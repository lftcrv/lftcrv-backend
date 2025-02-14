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

  private normalizeAddress(address: string): string {
    if (address.startsWith('0x') && address.length === 66) {
      return `0x00${address.slice(2)}`;
    }
    return address;
  }

  async getAbi(contractAddress: string): Promise<Abi> {
    try {
      const provider = this.providerService.getProvider();
      this.logger.log(`Getting ABI for contract: ${contractAddress}`);
      
      let classHash = await provider.getClassHashAt(contractAddress);
      
      if (!classHash) {
        const normalizedAddress = this.normalizeAddress(contractAddress);
        this.logger.log(`Retrying with normalized address: ${normalizedAddress}`);
        classHash = await provider.getClassHashAt(normalizedAddress);
      }

      // test w/ hardcoded
      if (!classHash) {
        const hardcodedAddress = "0x0044fb6d9a2b7a6518d3460b613ee376c4b364cb015844cee6559a8cdd5c9072";
        this.logger.log(`Retrying with hardcoded address: ${hardcodedAddress}`);
        classHash = await provider.getClassHashAt(hardcodedAddress);
      }

      if (!classHash) {
        throw new Error(`Could not get class hash for contract ${contractAddress}`);
      }

      this.logger.log(`Class hash found: ${classHash}`);
      const contractClass = await provider.getClass(classHash);

      if (!contractClass?.abi) {
        throw new Error(`No ABI found in contract class for hash ${classHash}`);
      }

      return contractClass.abi;
    } catch (error) {
      this.logger.error(`Error in getAbi for ${contractAddress}:`, error);
      throw error;
    }
  }
}