import { ITransactionService } from './transaction.interface';

export { ITransactionService };

export const TransactionTokens = {
  Service: Symbol('ITransactionService'),
} as const;
