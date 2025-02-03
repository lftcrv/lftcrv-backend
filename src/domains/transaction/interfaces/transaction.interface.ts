import { TransactionDto } from '../dto/transaction.dto';
import {
  Transaction,
  TransactionWithPagination,
} from '../entities/transaction.entity';

export interface ITransactionService {
  create(data: TransactionDto): Promise<Transaction>;
  findAll(params: TransactionQueryParams): Promise<TransactionWithPagination>;
  findOne(id: string): Promise<Transaction>;
  findByUserAddress(userAddress: string): Promise<Transaction[]>;
  findByTokenId(tokenId: string): Promise<Transaction[]>;
}

export interface TransactionQueryParams {
  skip?: number;
  take?: number;
  orderBy?: {
    [key: string]: 'asc' | 'desc';
  };
  userAddress?: string;
  tokenId?: string;
}
