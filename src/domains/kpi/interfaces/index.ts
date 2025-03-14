import { IAccountBalance } from "./kpi.interface";
export type { IAccountBalance };

export const AccountBalanceTokens = {
  AccountBalance: Symbol('IAccountBalance'),
} as const;
