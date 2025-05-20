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
  private readonly extendedPrisma: any;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject(AnalysisToken.AvnuPriceService)
    private readonly avnuPriceService: IPriceService,
    @Inject(AnalysisToken.ParadexPriceService)
    private readonly paradexPriceService: IPriceService,
  ) {
    // TTL de 5 minutes par défaut, configurable
    this.cacheTTL = this.configService.get<number>('PNL_CACHE_TTL_MS', 5 * 60 * 1000);
    this.extendedPrisma = this.prisma;
  }

  /**
   * Méthode principale pour obtenir le PnL d'un agent, utilisée par toutes les pages
   * @param runtimeAgentId ID d'exécution de l'agent
   * @param forceRefresh Forcer le rafraîchissement du cache
   */
  async getAgentPnL(runtimeAgentId: string, forceRefresh = false): Promise<any> {
    this.logger.debug(`Retrieving PnL for agent: ${runtimeAgentId}, forceRefresh: ${forceRefresh}`);
    
    // Chercher dans le cache sauf si le rafraîchissement est forcé
    if (!forceRefresh) {
      const cached = this.pnlCache.get(runtimeAgentId);
      const now = Date.now();
      
      // Utiliser le cache si disponible et pas expiré
      if (cached && (now - cached.timestamp) < this.cacheTTL) {
        this.logger.debug(`Using cached PnL data for agent: ${runtimeAgentId}`);
        return cached.data;
      }
    }

    // Trouver l'agent par runtimeAgentId
    let agent = await this.findAgentByRuntimeId(runtimeAgentId);
    
    // Si non trouvé, essayer par ID
    if (!agent) {
      agent = await this.prisma.elizaAgent.findUnique({
        where: { id: runtimeAgentId },
      });
    }

    if (!agent) {
      this.logger.warn(`Agent not found with runtimeAgentId: ${runtimeAgentId}`);
      return {
        error: 'Agent not found',
        runtimeAgentId
      };
    }

    // Calculer le PnL
    const pnlData = await this.calculatePnLForAgent(agent);
    
    // Mettre en cache
    this.pnlCache.set(runtimeAgentId, {
      data: pnlData,
      timestamp: Date.now()
    });
    
    // Mettre à jour les données LatestMarketData pour maintenir la cohérence
    await this.updateLatestMarketData(agent.id, pnlData);
    
    return pnlData;
  }

  /**
   * Méthode pour obtenir le PnL de tous les agents
   * @param forceRefresh Forcer le rafraîchissement du cache
   */
  async getAllAgentsPnL(forceRefresh = false): Promise<any[]> {
    this.logger.debug(`Retrieving PnL for all agents, forceRefresh: ${forceRefresh}`);
    
    const agents = await this.prisma.elizaAgent.findMany();
    const results = await Promise.all(
      agents.map(agent => this.getAgentPnL(agent.runtimeAgentId, forceRefresh))
    );
    
    return results.sort((a, b) => b.pnl - a.pnl);
  }

  /**
   * Calcule le PnL d'un agent avec filtrage des données non pertinentes
   */
  private async calculatePnLForAgent(agent: any): Promise<any> {
    const balances = await this.extendedPrisma.paradexAccountBalance.findMany({
      where: {
        agentId: agent.id,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (balances.length === 0) {
      return this.createEmptyPnLResult(agent);
    }

    // Filtrer les balances à zéro
    const nonZeroBalances = balances.filter(
      (balance) => balance.balanceInUSD !== 0 && balance.balanceInUSD !== null,
    );

    if (nonZeroBalances.length === 0) {
      return this.createEmptyPnLResult(agent);
    }

    // Premier et dernier records de balance
    const firstBalanceRecord = nonZeroBalances[0];
    const latestBalanceRecord = nonZeroBalances[nonZeroBalances.length - 1];

    // Récupérer les token balances
    const firstTokenBalances =
      await this.extendedPrisma.portfolioTokenBalance.findMany({
        where: { accountBalanceId: firstBalanceRecord.id },
      });

    const latestTokenBalances =
      await this.extendedPrisma.portfolioTokenBalance.findMany({
        where: { accountBalanceId: latestBalanceRecord.id },
      });

    // Calculer les valeurs de balance totales
    const firstTotalValueUsd = this.sumTokenValues(firstTokenBalances);
    const latestTotalValueUsd = this.sumTokenValues(latestTokenBalances);

    // Utiliser des valeurs calculées ou stockées si très proches
    const actualFirstBalance = this.getBestBalanceValue(
      firstTotalValueUsd, 
      firstBalanceRecord.balanceInUSD
    );

    const actualLatestBalance = this.getBestBalanceValue(
      latestTotalValueUsd, 
      latestBalanceRecord.balanceInUSD
    );

    // Calculer PnL et pourcentage
    const pnl = actualLatestBalance - actualFirstBalance;
    const pnlPercentage = actualFirstBalance !== 0 
      ? (pnl / actualFirstBalance) * 100 
      : 0;

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
    };
  }

  /**
   * Met à jour les données LatestMarketData pour garantir la cohérence
   */
  private async updateLatestMarketData(agentId: string, pnlData: any): Promise<void> {
    try {
      await this.prisma.latestMarketData.update({
        where: { elizaAgentId: agentId },
        data: {
          pnlCycle: pnlData.pnl,
          balanceInUSD: pnlData.latestBalance,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      // Si l'enregistrement n'existe pas, on le crée
      if (error.code === 'P2025') {
        await this.prisma.latestMarketData.create({
          data: {
            elizaAgentId: agentId,
            pnlCycle: pnlData.pnl,
            balanceInUSD: pnlData.latestBalance,
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
        this.logger.error(`Failed to update LatestMarketData: ${error.message}`);
      }
    }
  }

  /**
   * Méthodes utilitaires
   */
  private sumTokenValues(tokens: any[]): number {
    return tokens.reduce((sum, token) => sum + Number(token.valueUsd), 0);
  }

  private getBestBalanceValue(calculatedValue: number, storedValue: number): number {
    return Math.abs(calculatedValue - storedValue) < 0.01
      ? storedValue
      : calculatedValue || 0;
  }

  private createEmptyPnLResult(agent: any): any {
    return {
      agentId: agent.id,
      runtimeAgentId: agent.runtimeAgentId,
      name: agent.name,
      pnl: 0,
      pnlPercentage: 0,
      firstBalance: null,
      latestBalance: null,
      message: 'No valid balance data available for this agent',
    };
  }

  private async findAgentByRuntimeId(runtimeAgentId: string): Promise<any> {
    return this.prisma.elizaAgent.findFirst({
      where: {
        runtimeAgentId,
      },
    });
  }
} 