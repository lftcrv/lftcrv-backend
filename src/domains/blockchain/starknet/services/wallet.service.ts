import { Inject, Injectable, Logger } from '@nestjs/common';
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
import { ethers } from "ethers";

const ethereumRPC = `https://eth-mainnetalchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`;

@Injectable()
export class WalletService implements IStarknetWallet {
  private readonly logger = new Logger(WalletService.name);
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

    // const provider = new ethers.JsonRpcProvider(ethereumRPC);
    const ethWallet = ethers.Wallet.createRandom();
    const ethereumPrivateKey = ethWallet.privateKey;
    const ethereumAccountAddress = ethWallet.address;

    return {
      privateKey,
      starkKeyPub,
      ozContractAddress,
      ozAccountConstructorCallData,
      ozAccountClassHash,
      ethereumPrivateKey,
      ethereumAccountAddress
    };
  }

  async transferFunds(ozWallet: OZWallet): Promise<OZWallet> {
    const AMOUNT = 250000000000000n; // 0,00025 ETH in wei

    // Initialize the provider
    const provider = this.providerService.getProvider();

    // Initialize the admin account
    const adminAccount = this.accountService.getAdminAccount();

    const ethTokenAddress = this.configService.get<string>('ETH_TOKEN_ADDRESS');

    try {
      // Fetch the ABI of the ETH token contract
      const classResponse = await provider.getClassAt(ethTokenAddress);

      if (!classResponse?.abi) {
        throw new Error('No ABI found in ETH token contract class response');
      }
      const ethTokenAbi = classResponse.abi;

      // Create a contract instance for the ETH token
      const ethContract = new Contract(ethTokenAbi, ethTokenAddress, provider);
      ethContract.connect(adminAccount);

      // Prepare the transfer call
      const transferCalldata = ethContract.populate('transfer', {
        recipient: ozWallet.ozContractAddress,
        amount: uint256.bnToUint256(AMOUNT),
      });

      // Execute the transfer
      const { transaction_hash } = await adminAccount.execute(transferCalldata);

      // Wait for the transaction to be accepted
      await provider.waitForTransaction(transaction_hash);

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
