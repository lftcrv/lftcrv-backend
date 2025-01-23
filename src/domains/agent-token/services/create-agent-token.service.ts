import { Inject, Injectable } from '@nestjs/common';
import { ICreateAgentToken } from '../interfaces';
import { ConfigService } from '@nestjs/config';
import { CallData, Contract } from 'starknet';
import * as contractClassJson from '../contracts/tax_erc20_BondingCurve.contract_class.json';
import * as compiledContractJson from '../contracts/tax_erc20_BondingCurve.compiled_contract_class.json';
import {
  CreateAgentTokenContract,
  CreateAgentTokenProps,
} from '../interfaces/create-agent-token.interface';
import {
  BlockchainTokens,
  IAccountService,
  IProviderService,
} from 'src/shared/blockchain/interfaces';

export const contractJson = contractClassJson;
export const csmJson = compiledContractJson;

@Injectable()
export class CreateAgentTokenService implements ICreateAgentToken {
  constructor(
    private readonly configService: ConfigService,
    @Inject(BlockchainTokens.Provider)
    private readonly providerService: IProviderService,
    @Inject(BlockchainTokens.Account)
    private readonly accountService: IAccountService,
  ) {}
  async createAgentToken({
    name,
    symbol,
  }: CreateAgentTokenProps): Promise<CreateAgentTokenContract> {
    const provider = this.providerService.getProvider();

    const account = this.accountService.getAdminAccount();

    const args = {
      _protocol_wallet: this.configService.get('PROTOCOL_WALLET'),
      _owner: this.configService.get('OWNER_WALLET'),
      _name: name,
      _symbol: symbol,
      price_x1e18: this.configService.get('PRICE'),
      exponent_x1e18: this.configService.get('EXPONENT'),
      _step: this.configService.get('STEP'),
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
