import { Injectable, NotFoundException } from '@nestjs/common';
import { ITradingInformation } from '../interfaces/trading-information.interface';
import { TradingInformation } from '../entities/trading-information.entity';
import { TradingInformationDto } from '../dtos/trading-information.dto';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class TradingInformationService implements ITradingInformation {
  constructor(private readonly prisma: PrismaService) {}
  getAllTradingInformation(): Promise<TradingInformation[]> {
    return this.prisma.tradingInformation.findMany();
  }

  getTradingInformationPerAgent(
    databaseId: string,
  ): Promise<TradingInformation[]> {
    return this.prisma.tradingInformation.findMany({
      where: {
        elizaAgentId: databaseId,
      },
    });
  }

  getTradingInformation(id: string): Promise<TradingInformation> {
    return this.prisma.tradingInformation.findUnique({ where: { id } });
  }

  async createTradingInformation(
    data: TradingInformationDto,
  ): Promise<TradingInformation> {
    // find agent with runtimeAgentID, TODO normally no need to do that, we should use directly id
    const agent = await this.prisma.elizaAgent.findFirst({
      where: {
        runtimeAgentId: data.runtimeAgentId,
      },
    });

    if (!agent) {
      throw new NotFoundException(
        `Agent with runtime ID ${data.runtimeAgentId} not found`,
      );
    }

    return this.prisma.tradingInformation.create({
      data: {
        createdAt: new Date(),
        information: data.information,
        elizaAgentId: agent.id,  // Use DB id
      },
    });
  }
}
