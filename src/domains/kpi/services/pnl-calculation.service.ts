import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { IPriceService } from '../../analysis/technical/interfaces/price.interface';
import { AnalysisToken } from '../../analysis/technical/interfaces';

interface PnLCacheEntry {
  data: any;
  timestamp: number;
}

@Injectable()
export class PnLCalculationService {
  private readonly logger = new Logger(PnLCalculationService.name);
  private readonly pnlCache: Map<string, PnLCacheEntry> = new Map();
  private readonly cacheTTL: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject(AnalysisToken.AvnuPriceService)
    private readonly avnuPriceService: IPriceService,
    @Inject(AnalysisToken.ParadexPriceService)
    private readonly paradexPriceService: IPriceService,
  ) {
    this.cacheTTL = this.configService.get<number>(
      'PNL_CACHE_TTL_MS',
      5 * 60 * 1000, // Default to 5 minutes
    );
  }

  /**
   * Méthode principale pour obtenir le PnL d'un agent, utilisée par toutes les pages
   * @param runtimeAgentId ID d'exécution de l'agent
   * @param forceRefresh Forcer le rafraîchissement du cache
   */
  async getAgentPnL(
    runtimeAgentId: string,
    forceRefresh = false,
  ): Promise<any> {
    this.logger.debug(
      `Retrieving PnL for agent: ${runtimeAgentId}, forceRefresh: ${forceRefresh}`,
    );

    if (!forceRefresh) {
      const cached = this.pnlCache.get(runtimeAgentId);
      const now = Date.now();

      if (cached && now - cached.timestamp < this.cacheTTL) {
        this.logger.debug(`Using cached PnL data for agent: ${runtimeAgentId}`);
        return cached.data;
      }
    }

    let agent = await this.findAgentByRuntimeId(runtimeAgentId);

    if (!agent) {
      agent = await this.prisma.elizaAgent.findUnique({
        where: { id: runtimeAgentId },
      });
    }

    if (!agent) {
      this.logger.warn(
        `Agent not found with runtimeAgentId: ${runtimeAgentId}`,
      );
      return {
        error: 'Agent not found',
        runtimeAgentId,
      };
    }

    const pnlData = await this.calculatePnLForAgent(agent);

    this.pnlCache.set(runtimeAgentId, {
      data: pnlData,
      timestamp: Date.now(),
    });

    await this.updateLatestMarketData(agent.id, pnlData);

    return pnlData;
  }

  /**
   * Méthode pour obtenir le PnL de tous les agents
   * @param forceRefresh Forcer le rafraîchissement du cache
   */
  async getAllAgentsPnL(forceRefresh = false): Promise<any[]> {
    this.logger.debug(
      `Retrieving PnL for all agents, forceRefresh: ${forceRefresh}`,
    );
    const agents = await this.prisma.elizaAgent.findMany({
      where: { status: 'RUNNING' }, // Example: consider only running agents
    });
    return Promise.all(
      agents.map((agent) =>
        this.getAgentPnL(agent.runtimeAgentId, forceRefresh),
      ),
    );
  }

  /**
   * Calcule le PnL d'un agent avec filtrage des données non pertinentes
   */
  private async calculatePnLForAgent(agent: any): Promise<any> {
    const balances = await this.prisma.paradexAccountBalance.findMany({
      where: { agentId: agent.id },
      orderBy: { createdAt: 'asc' },
      include: {
        tokenBalances: true, // Include related token balances
      },
    });

    if (balances.length < 1) {
      // If only one or no balance record, PnL is 0 or not applicable
      return {
        agentId: agent.id,
        runtimeAgentId: agent.runtimeAgentId,
        name: agent.name,
        pnl: 0,
        pnlPercentage: 0,
        firstBalanceDate: null,
        latestBalanceDate: null,
        firstBalance:
          balances.length === 1
            ? await this.getActualBalance(balances[0], true)
            : 0,
        latestBalance:
          balances.length === 1
            ? await this.getActualBalance(balances[0], false)
            : 0,
      };
    }

    const firstBalanceRecord = balances[0];
    const latestBalanceRecord = balances[balances.length - 1];

    // Use stored prices for first balance (historical value when portfolio was created)
    const actualFirstBalance = await this.getActualBalance(
      firstBalanceRecord,
      true,
    );
    // Use calculated prices for latest balance (current value with live prices)
    const actualLatestBalance = await this.getActualBalance(
      latestBalanceRecord,
      false,
    );

    // SPECIAL CASE: Handle initial investment scenario
    // If first balance is 0 (due to old portfolio creation bug) but latest balance shows value,
    // this likely represents initial investment, not a gain
    let adjustedFirstBalance = actualFirstBalance;
    let isInitialInvestmentScenario = false;

    if (actualFirstBalance === 0 && actualLatestBalance > 0) {
      // Check if this looks like an initial investment (single token, round number)
      const firstTokenBalances = firstBalanceRecord.tokenBalances || [];
      const latestTokenBalances = latestBalanceRecord.tokenBalances || [];

      // If we have token balance data and it looks like initial USDC investment
      if (firstTokenBalances.length === 1 && latestTokenBalances.length === 1) {
        const firstToken = firstTokenBalances[0];
        const latestToken = latestTokenBalances[0];

        // Check if it's USDC and amounts are the same (no trading activity)
        if (
          firstToken.tokenSymbol === 'USDC' &&
          latestToken.tokenSymbol === 'USDC' &&
          Number(firstToken.amount) === Number(latestToken.amount)
        ) {
          // This is likely initial investment - use the calculated value as baseline
          adjustedFirstBalance = actualLatestBalance;
          isInitialInvestmentScenario = true;

          this.logger.debug(
            `Detected initial investment scenario for agent ${agent.name}: ` +
              `adjusting first balance from ${actualFirstBalance} to ${adjustedFirstBalance}`,
          );
        }
      }
    }

    const pnl = actualLatestBalance - adjustedFirstBalance;
    const pnlPercentage =
      adjustedFirstBalance !== 0 ? (pnl / adjustedFirstBalance) * 100 : 0;

    return {
      agentId: agent.id,
      runtimeAgentId: agent.runtimeAgentId,
      name: agent.name,
      pnl,
      pnlPercentage,
      firstBalanceDate: firstBalanceRecord.createdAt,
      latestBalanceDate: latestBalanceRecord.createdAt,
      firstBalance: actualFirstBalance,
      latestBalance: actualLatestBalance,
      adjustedFirstBalance: isInitialInvestmentScenario
        ? adjustedFirstBalance
        : undefined,
      isInitialInvestmentScenario,
    };
  }

  private async getActualBalance(
    balanceRecord: any,
    useStoredPrices: boolean = false,
  ): Promise<number> {
    if (!balanceRecord) return 0;

    // If we want stored prices (for historical first balance), use the stored value
    if (useStoredPrices) {
      return balanceRecord.balanceInUSD || 0;
    }

    // Otherwise, use enhanced Prisma service to get calculated values with current prices
    const enhancedClient = this.prisma.getEnhanced();
    const calculatedBalance =
      await enhancedClient.portfolioCalculations.getAccountBalanceWithPrices(
        balanceRecord.id,
      );

    if (calculatedBalance) {
      // Use the calculated balance from our enhanced service
      return Number(calculatedBalance.calculated_balance_usd) || 0;
    }

    // Fallback to stored balance if calculation fails
    return balanceRecord.balanceInUSD || 0;
  }

  /**
   * Met à jour les données LatestMarketData pour garantir la cohérence
   */
  private async updateLatestMarketData(
    agentId: string,
    pnlData: any,
  ): Promise<void> {
    try {
      await this.prisma.latestMarketData.update({
        where: { elizaAgentId: agentId },
        data: {
          pnlCycle: pnlData.pnl || 0,
          balanceInUSD: pnlData.latestBalance || 0,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        await this.prisma.latestMarketData.create({
          data: {
            elizaAgentId: agentId,
            pnlCycle: pnlData.pnl || 0,
            balanceInUSD: pnlData.latestBalance || 0,
            price: 0,
            priceChange24h: 0,
            holders: 0,
            marketCap: 0,
            bondingStatus: 'BONDING',
            forkCount: 0,
            pnl24h: 0,
            tradeCount: 0,
            tvl: 0,
            updatedAt: new Date(),
          },
        });
      } else {
        this.logger.error(
          `Failed to update/create LatestMarketData for agent ${agentId}: ${error.message}`,
        );
      }
    }
  }

  private async findAgentByRuntimeId(runtimeAgentId: string): Promise<any> {
    return this.prisma.elizaAgent.findFirst({
      where: {
        runtimeAgentId,
      },
    });
  }
}
