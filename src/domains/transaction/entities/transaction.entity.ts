import { TransactionDto } from '../dto/transaction.dto';

export interface Transaction extends TransactionDto {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionWithPagination {
  data: Transaction[];
  total: number;
  skip: number;
  take: number;
}
