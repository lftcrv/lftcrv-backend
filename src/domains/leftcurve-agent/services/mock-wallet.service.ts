import { Injectable } from '@nestjs/common';

/**
 * This service provides mock wallet data for compatibility purposes
 * while the real wallet functionality has been removed
 */
@Injectable()
export class MockWalletService {
  /**
   * Creates mock wallet data for use in places that still expect wallet information
   */
  createMockWalletData() {
    return {
      privateKey:
        '0x0000000000000000000000000000000000000000000000000000000000000000',
      starkKeyPub:
        '0x0000000000000000000000000000000000000000000000000000000000000000',
      ozContractAddress:
        '0x0000000000000000000000000000000000000000000000000000000000000000',
      ethereumPrivateKey:
        '0x0000000000000000000000000000000000000000000000000000000000000000',
      ethereumAccountAddress: '0x0000000000000000000000000000000000000000',
    };
  }
}
