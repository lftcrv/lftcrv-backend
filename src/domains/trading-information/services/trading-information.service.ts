import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ITradingInformation } from '../interfaces/trading-information.interface';
import { TradingInformation } from '../entities/trading-information.entity';
import { TradingInformationDto } from '../dtos/trading-information.dto';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class TradingInformationService implements ITradingInformation {
  private readonly logger = new Logger(TradingInformationService.name);

  constructor(private readonly prisma: PrismaService) {}

  getAllTradingInformation(): Promise<TradingInformation[]> {
    return this.prisma.tradingInformation.findMany();
  }

  async getTradingInformationPerAgent(
    databaseId: string,
  ): Promise<TradingInformation[]> {
    // First verify the agent exists
    const agent = await this.prisma.elizaAgent.findUnique({
      where: { id: databaseId },
    });

    if (!agent) {
      throw new NotFoundException(`Agent not found with ID: ${databaseId}`);
    }

    const trades = await this.prisma.tradingInformation.findMany({
      where: {
        elizaAgentId: databaseId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return trades;
  }

  getTradingInformation(id: string): Promise<TradingInformation> {
    return this.prisma.tradingInformation.findUnique({ where: { id } });
  }

  async createTradingInformation(
    data: TradingInformationDto,
  ): Promise<TradingInformation> {
    this.logger.log('Creating trading information:', data);

    const agent = await this.prisma.elizaAgent.findFirst({
      where: {
        runtimeAgentId: {
          startsWith: data.runtimeAgentId,
        },
      },
    });

    if (!agent) {
      // If no agent found with the prefix, try to find it by exact match (fallback)
      const exactAgent = await this.prisma.elizaAgent.findFirst({
        where: {
          runtimeAgentId: data.runtimeAgentId,
        },
      });

      if (!exactAgent) {
        throw new NotFoundException(
          `Agent with runtimeAgentId starting with ${data.runtimeAgentId} not found`,
        );
      }

      return this.prisma.tradingInformation.create({
        data: {
          createdAt: new Date(),
          information: data.information,
          elizaAgentId: exactAgent.id,
        },
      });
    }

    return this.prisma.tradingInformation.create({
      data: {
        createdAt: new Date(),
        information: data.information,
        elizaAgentId: agent.id,
      },
    });
  }
}
