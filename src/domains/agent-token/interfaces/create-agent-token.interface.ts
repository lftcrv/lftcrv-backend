import { Contract } from 'starknet';

export interface CreateAgentTokenProps {
  name: string;
  symbol: string;
}

export interface CreateAgentTokenContract {
  contract: Contract;
  deployResponse: any;
}

export interface ICreateAgentToken {
  createAgentToken(
    bondingArgs: CreateAgentTokenProps,
  ): Promise<CreateAgentTokenContract>;
}
