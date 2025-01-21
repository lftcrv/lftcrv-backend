import { Injectable } from '@nestjs/common';
import { IStarknetWallet } from '../interfaces';
import {
  Account,
  CallData,
  Contract,
  ec,
  hash,
  RpcProvider,
  stark,
  uint256,
} from 'starknet';
import { ConfigService } from '@nestjs/config';
import { OZWallet } from '../entities/wallet.entity';

@Injectable()
export class WalletService implements IStarknetWallet {
  constructor(private readonly configService: ConfigService) {}
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
    const AMOUNT = 100000000000000n; // 0.0001 ETH in wei
    const nodeUrl = this.configService.get<string>('NODE_URL');

    // Initialize the provider
    const provider = new RpcProvider({
      nodeUrl,
    });

    // Initialize the admin account
    const adminAccount = new Account(
      provider,
      this.configService.get<string>('ADMIN_WALLET_ADDRESS'),
      this.configService.get<string>('ADMIN_WALLET_PK'),
    );

    const ethTokenAddress = this.configService.get<string>('ETH_TOKEN_ADDRESS');

    // Fetch the ABI of the ETH token contract
    const { abi: ethTokenAbi } = await provider.getClassAt(ethTokenAddress);
    if (!ethTokenAbi) {
      throw new Error('Failed to retrieve ETH token contract ABI.');
    }

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

    console.log(
      `Transferred ${AMOUNT} wei to ${ozWallet.ozContractAddress}. Transaction hash: ${transaction_hash}`,
    );

    return {
      ...ozWallet,
      fundTransactionHash: transaction_hash,
    };
  }

  async deployWallet(ozWallet: OZWallet): Promise<OZWallet> {
    const provider = new RpcProvider({
      nodeUrl: `${this.configService.get('NODE_URL')}`,
    });

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
