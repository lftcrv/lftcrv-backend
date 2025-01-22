import { ICreateBondingCurve } from './create-bonding-curve.interface';

export { ICreateBondingCurve };

export const BondingCurveTokens = {
  CreateBondingCurve: Symbol('ICreateBondingCurve'),
} as const;
