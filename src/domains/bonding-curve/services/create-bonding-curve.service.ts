import { Injectable } from '@nestjs/common';
import { ICreateBondingCurve } from '../interfaces';
import { ConfigService } from '@nestjs/config';
import { Account, CallData, Contract, RpcProvider } from 'starknet';
import * as contractClassJson from '../contracts/tax_erc20_BondingCurve.contract_class.json';
import * as compiledContractJson from '../contracts/tax_erc20_BondingCurve.compiled_contract_class.json';
import {
  CreateBondingCurveContract,
  CreateBondingCurveProps,
} from '../interfaces/create-bonding-curve.interface';

export const contractJson = contractClassJson;
export const csmJson = compiledContractJson;

@Injectable()
export class CreateBondingCurveService implements ICreateBondingCurve {
  constructor(private readonly configService: ConfigService) {}
  async createBondingCurve({
    name,
    symbol,
  }: CreateBondingCurveProps): Promise<CreateBondingCurveContract> {
    const provider = new RpcProvider({
      nodeUrl: `${this.configService.get('NODE_URL')}`,
    });

    const privateKey = this.configService.get('ADMIN_WALLET_PK');
    const accountAddress = this.configService.get('ADMIN_WALLET_ADDRESS');

    const account = new Account(provider, accountAddress, privateKey);

    const args = {
      _protocol_wallet: this.configService.get('ADMIN_WALLET_PK'),
      _owner: this.configService.get('OWNER_WALLET'),
      _name: name,
      _symbol: symbol,
      price_x1e9: this.configService.get('PRICE'),
      exponent_x1e9: this.configService.get('EXPONENT'),
      buy_tax_percentage_x100: this.configService.get('BUY_TAX_PERCENTAGE'),
      sell_tax_percentage_x100: this.configService.get('SELL_TAX_PERCENTAGE'),
    };

    const contractCallData = new CallData(contractJson.abi);
    const constructorCalldata = contractCallData.compile('constructor', args);

    const deployResponse = await account.declareAndDeploy({
      contract: contractJson as any,
      casm: csmJson,
      constructorCalldata: constructorCalldata,
    });

    const deployedContract = new Contract(
      contractJson.abi,
      deployResponse.deploy.contract_address,
      provider,
    );

    return {
      contract: deployedContract,
      deployResponse: deployResponse,
    };
  }
}
