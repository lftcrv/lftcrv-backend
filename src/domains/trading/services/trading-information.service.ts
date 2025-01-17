import { Injectable } from '@nestjs/common';
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

  createTradingInformation(
    data: TradingInformationDto,
  ): Promise<TradingInformation> {
    return this.prisma.tradingInformation.create({
      data: {
        createdAt: new Date(),
        information: data.information,
        elizaAgentId: data.runtimeAgentId,
      },
    });
  }
}
