import { Abi } from 'starknet';

export interface IAbiService {
  getAbi(contractAddress: string): Promise<Abi>;
}
