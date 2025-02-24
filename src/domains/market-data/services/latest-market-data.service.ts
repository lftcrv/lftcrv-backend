import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../shared/prisma/prisma.service';
import { ILatestMarketDataService } from '../interfaces/latest-market-data.interface';
import { LatestMarketData } from 'src/domains/leftcurve-agent/entities/leftcurve-agent.entity';

@Injectable()
export class ElizaAgentCreateService implements ILatestMarketDataService {
  constructor(private readonly prisma: PrismaService) {}

  async updateMarketData(
    agentId: string,
    marketData: Partial<LatestMarketData>,
  ): Promise<LatestMarketData> {
    return this.prisma.latestMarketData.upsert({
      where: { elizaAgentId: agentId },
      create: {
        elizaAgentId: agentId,
        ...marketData,
      },
      update: marketData,
    });
  }
}
