import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  createEnhancedPrismaClient,
  EnhancedPortfolioClient,
} from './prisma-extensions';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private enhancedClient: EnhancedPortfolioClient;

  constructor() {
    super({
      log: ['query', 'info', 'warn', 'error'],
    });
    // Create the enhanced client for portfolio calculations
    this.enhancedClient = createEnhancedPrismaClient(this);
  }

  async onModuleInit() {
    await this.$connect();
  }

  /**
   * Get the enhanced Prisma client with portfolio calculation features
   */
  getEnhanced(): EnhancedPortfolioClient {
    return this.enhancedClient;
  }
}
