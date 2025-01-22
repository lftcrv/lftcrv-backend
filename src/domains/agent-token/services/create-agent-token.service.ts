import { Injectable } from '@nestjs/common';
import { ICreateAgentToken } from '../interfaces';
import { ConfigService } from '@nestjs/config';
import { Account, CallData, Contract, RpcProvider } from 'starknet';
import * as contractClassJson from '../contracts/tax_erc20_BondingCurve.contract_class.json';
import * as compiledContractJson from '../contracts/tax_erc20_BondingCurve.compiled_contract_class.json';
import {
  CreateAgentTokenContract,
  CreateAgentTokenProps,
} from '../interfaces/create-agent-token.interface';

export const contractJson = contractClassJson;
export const csmJson = compiledContractJson;

@Injectable()
export class CreateAgentTokenService implements ICreateAgentToken {
  constructor(private readonly configService: ConfigService) {}
  async createAgentToken({
    name,
    symbol,
  }: CreateAgentTokenProps): Promise<CreateAgentTokenContract> {
    const provider = new RpcProvider({
      nodeUrl: `${this.configService.get('NODE_URL')}`,
    });

    const privateKey = this.configService.get('ADMIN_WALLET_PK');
    const accountAddress = this.configService.get('ADMIN_WALLET_ADDRESS');

    const account = new Account(provider, accountAddress, privateKey);

    const args = {
      _protocol_wallet: this.configService.get('PROTOCOL_WALLET'),
      _owner: this.configService.get('OWNER_WALLET'),
      _name: name,
      _symbol: symbol,
      price_x1e18: this.configService.get('PRICE'),
      exponent_x1e18: this.configService.get('EXPONENT'),
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
