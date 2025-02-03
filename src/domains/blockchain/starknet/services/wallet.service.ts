import { Inject, Injectable } from '@nestjs/common';
import { IStarknetWallet } from '../interfaces';
import {
  Account,
  CallData,
  Contract,
  ec,
  hash,
  stark,
  uint256,
} from 'starknet';
import { ConfigService } from '@nestjs/config';
import { OZWallet } from '../entities/wallet.entity';
import {
  BlockchainTokens,
  IAccountService,
  IProviderService,
} from '../../../../shared/blockchain/interfaces';

@Injectable()
export class WalletService implements IStarknetWallet {
  constructor(
    private readonly configService: ConfigService,
    @Inject(BlockchainTokens.Provider)
    private readonly providerService: IProviderService,
    @Inject(BlockchainTokens.Account)
    private readonly accountService: IAccountService,
  ) {}
  createWallet(): OZWallet {
    const privateKey = stark.randomAddress();

    const starkKeyPub = ec.starkCurve.getStarkKey(privateKey);

    const ozAccountClassHash = this.configService.get('OZ_ACCOUNT_CLASSHASH');

    const ozAccountConstructorCallData = CallData.compile({
      publicKey: starkKeyPub,
    });
    const ozContractAddress = hash.calculateContractAddressFromHash(
      starkKeyPub,
      ozAccountClassHash,
      ozAccountConstructorCallData,
      0,
    );

    return {
      privateKey,
      starkKeyPub,
      ozContractAddress,
      ozAccountConstructorCallData,
      ozAccountClassHash,
    };
  }

  async transferFunds(ozWallet: OZWallet): Promise<OZWallet> {
    console.log('Starting transferFunds with wallet:', ozWallet);
    const AMOUNT = 100000000000000n; // 0.0001 ETH in wei

    // Initialize the provider
    const provider = this.providerService.getProvider();
    console.log('Provider initialized:', provider);

    // Initialize the admin account
    const adminAccount = this.accountService.getAdminAccount();
    console.log('Admin account:', adminAccount);

    const ethTokenAddress = this.configService.get<string>('ETH_TOKEN_ADDRESS');
    console.log('ETH token address:', ethTokenAddress);

    try {
      // Fetch the ABI of the ETH token contract
      console.log('Fetching ETH token contract class...');
      const classResponse = await provider.getClassAt(ethTokenAddress);
      console.log('ETH token contract class response:', classResponse);

      if (!classResponse?.abi) {
        throw new Error('No ABI found in ETH token contract class response');
      }
      const ethTokenAbi = classResponse.abi;

      // Create a contract instance for the ETH token
      console.log('Creating ETH contract instance...');
      const ethContract = new Contract(ethTokenAbi, ethTokenAddress, provider);
      ethContract.connect(adminAccount);

      // Prepare the transfer call
      console.log('Preparing transfer call...');
      const transferCalldata = ethContract.populate('transfer', {
        recipient: ozWallet.ozContractAddress,
        amount: uint256.bnToUint256(AMOUNT),
      });
      console.log('Transfer calldata:', transferCalldata);

      // Execute the transfer
      console.log('Executing transfer...');
      const { transaction_hash } = await adminAccount.execute(transferCalldata);
      console.log('Transfer executed, hash:', transaction_hash);

      // Wait for the transaction to be accepted
      console.log('Waiting for transaction confirmation...');
      await provider.waitForTransaction(transaction_hash);
      console.log('Transaction confirmed');

      return {
        ...ozWallet,
        fundTransactionHash: transaction_hash,
      };
    } catch (error) {
      console.error('Transfer funds error:', error);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  async deployWallet(ozWallet: OZWallet): Promise<OZWallet> {
    const provider = this.providerService.getProvider();

    const OZaccount = new Account(
      provider,
      ozWallet.ozContractAddress,
      ozWallet.privateKey,
    );

    const { transaction_hash, contract_address } =
      await OZaccount.deployAccount({
        classHash: ozWallet.ozAccountClassHash,
        constructorCalldata: ozWallet.ozAccountConstructorCallData,
        addressSalt: ozWallet.starkKeyPub,
      });

    await provider.waitForTransaction(transaction_hash);

    return {
      ...ozWallet,
      deployTransactionHash: transaction_hash,
      deployedContractAddress: contract_address,
    };
  }
}
