import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { StarkscanScraperService } from '../../shared/services/starkscan-scraper.service';

@Injectable()
export class UpdateHoldersTask {
  private readonly logger = new Logger(UpdateHoldersTask.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scraperService: StarkscanScraperService,
  ) {}

  async execute(): Promise<void> {
    const startTime = Date.now();
    this.logger.log('🔄 Starting holder count update cycle');

    try {
      // Get all tokens
      const agents = await this.prisma.elizaAgent.findMany({
        where: {
          Token: {
            isNot: null,
          },
        },
      });

      let successCount = 0;
      let failureCount = 0;

      // Update holders count for each token
      for (const agent of agents) {
        try {
          await this.updateHoldersCount(agent.id);
          successCount++;
        } catch (error) {
          failureCount++;
          this.logger.error(
            `Failed to update holders for agent ${agent.id}: ${error.message}`,
          );
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `✅ Holder count update cycle completed - Success: ${successCount}, Failed: ${failureCount}, Duration: ${duration}ms`,
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Failed to complete holder count update cycle (${duration}ms): ${error.message}`,
      );
    }
  }

  private async updateHoldersCount(agentId: string): Promise<void> {
    // Get the agent token
    const agentToken = await this.prisma.agentToken.findFirst({
      where: { elizaAgentId: agentId },
    });

    if (!agentToken) {
      this.logger.warn(`No token found for agent ${agentId}`);
      return;
    }

    // Get holders count from Starkscan
    const holders = await this.scraperService.getTokenHolders(
      agentToken.contractAddress,
    );

    // Update latest market data
    await this.prisma.latestMarketData.update({
      where: { elizaAgentId: agentId },
      data: {
        holders,
        updatedAt: new Date(),
      },
    });

    this.logger.log(
      `Updated holders count for ${agentToken.symbol}: ${holders}`,
    );
  }
} 