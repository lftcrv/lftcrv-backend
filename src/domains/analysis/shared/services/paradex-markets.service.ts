import { Injectable, Logger } from '@nestjs/common';
import { ParadexMarket, ParadexMarketsResponse } from '../interfaces/paradex.interface';
import axios from 'axios';
import { PrismaService } from 'src/shared/prisma/prisma.service';

@Injectable()
export class ParadexMarketsService {
  private readonly logger = new Logger(ParadexMarketsService.name);
  private readonly PARADEX_API_URL = 'https://api.testnet.paradex.trade/v1/markets';

  constructor(private prisma: PrismaService) {}

  async fetchAndUpdateMarkets(): Promise<void> {
    try {
      // Fetch markets data from Paradex API
      const response = await axios.get<ParadexMarketsResponse>(this.PARADEX_API_URL, {
        headers: {
          'Accept': 'application/json'
        }
      });

      const markets = response.data.results;

      // Update database using prisma transaction
      await this.prisma.$transaction(async (prisma) => {
        // First, mark all existing markets as inactive
        await prisma.paradexMarket.updateMany({
          data: {
            isActive: false,
          },
        });

        // Then upsert each market
        for (const market of markets) {
          await prisma.paradexMarket.upsert({
            where: {
              symbol: market.symbol,
            },
            create: {
              symbol: market.symbol,
              baseCurrency: market.base_currency,
              quoteCurrency: market.quote_currency,
              assetKind: market.asset_kind,
              isActive: true,
              positionLimit: market.position_limit,
              minNotional: market.min_notional,
            },
            update: {
              baseCurrency: market.base_currency,
              quoteCurrency: market.quote_currency,
              assetKind: market.asset_kind,
              isActive: true,
              positionLimit: market.position_limit,
              minNotional: market.min_notional,
            },
          });
        }
      });

      this.logger.log(`Successfully updated ${markets.length} markets in database`);
    } catch (error) {
      this.logger.error('Error fetching markets from Paradex:', error);
      throw error;
    }
  }

  async getAllMarkets() {
    return this.prisma.paradexMarket.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        symbol: 'asc',
      },
    });
  }

  async getAllSymbols(): Promise<string[]> {
    const markets = await this.prisma.paradexMarket.findMany({
      where: {
        isActive: true,
      },
      select: {
        symbol: true,
      },
      orderBy: {
        symbol: 'asc',
      },
    });
    
    return markets.map(market => market.symbol);
  }

  async getMarketBySymbol(symbol: string) {
    return this.prisma.paradexMarket.findUnique({
      where: {
        symbol: symbol.toUpperCase(),
      },
    });
  }
}