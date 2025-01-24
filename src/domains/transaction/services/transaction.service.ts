import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { ITransactionService } from '../interfaces';
import { TransactionDto } from '../dto/transaction.dto';
import {
  Transaction,
  TransactionWithPagination,
} from '../entities/transaction.entity';
import { TransactionQueryParams } from '../interfaces/transaction.interface';

@Injectable()
export class TransactionService implements ITransactionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: TransactionDto): Promise<Transaction> {
    return this.prisma.transaction.create({
      data: {
        ...data,
        buyAmount: data.buyAmount,
        sellAmount: data.sellAmount,
      },
    });
  }

  async findAll(
    params: TransactionQueryParams,
  ): Promise<TransactionWithPagination> {
    const {
      skip = 0,
      take = 10,
      orderBy = { createdAt: 'desc' },
      userAddress,
      tokenId,
    } = params;

    const where = {
      ...(userAddress && { userAddress }),
      ...(tokenId && { tokenId }),
    };

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        skip,
        take,
        where,
        orderBy,
        include: {
          AgentToken: true,
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data: transactions.map((tx) => ({
        ...tx,
        buyAmount: BigInt(tx.buyAmount.toString()),
        sellAmount: BigInt(tx.sellAmount.toString()),
      })),
      total,
      skip,
      take,
    };
  }

  async findOne(id: string): Promise<Transaction> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        AgentToken: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    return {
      ...transaction,
      buyAmount: BigInt(transaction.buyAmount.toString()),
      sellAmount: BigInt(transaction.sellAmount.toString()),
    };
  }

  async findByUserAddress(userAddress: string): Promise<Transaction[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: { userAddress },
      include: {
        AgentToken: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return transactions.map((tx) => ({
      ...tx,
      buyAmount: BigInt(tx.buyAmount.toString()),
      sellAmount: BigInt(tx.sellAmount.toString()),
    }));
  }

  async findByTokenId(tokenId: string): Promise<Transaction[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: { tokenId },
      include: {
        AgentToken: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return transactions.map((tx) => ({
      ...tx,
      buyAmount: BigInt(tx.buyAmount.toString()),
      sellAmount: BigInt(tx.sellAmount.toString()),
    }));
  }
}
