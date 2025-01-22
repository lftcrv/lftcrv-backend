import { Contract } from 'starknet';

export interface CreateBondingCurveProps {
  name: string;
  symbol: string;
}

export interface CreateBondingCurveContract {
  contract: Contract;
  deployResponse: any;
}

export interface ICreateBondingCurve {
  createBondingCurve(
    bondingArgs: CreateBondingCurveProps,
  ): Promise<CreateBondingCurveContract>;
}
