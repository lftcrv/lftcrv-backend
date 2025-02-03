import { PrismaService } from 'src/shared/prisma/prisma.service';
import { ParadexMarket } from '@prisma/client';

/**
 * Retrieves all active markets sorted by symbol in ascending order.
 *
 * @param prisma An instance of PrismaService.
 * @returns A promise that resolves to an array of ParadexMarket objects.
 */
export async function getAllMarkets(prisma: PrismaService): Promise<ParadexMarket[]> {
  return prisma.paradexMarket.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      symbol: 'asc',
    },
  });
}

/**
 * Retrieves the symbols of all active markets sorted in ascending order.
 *
 * @param prisma An instance of PrismaService.
 * @returns A promise that resolves to an array of symbols.
 */
export async function getAllSymbols(prisma: PrismaService): Promise<string[]> {
  const markets = await prisma.paradexMarket.findMany({
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

/**
 * Retrieves a market by its symbol.
 *
 * @param prisma An instance of PrismaService.
 * @param symbol The symbol of the market.
 * @returns A promise that resolves to a ParadexMarket object or null if not found.
 */
export async function getMarketBySymbol(prisma: PrismaService, symbol: string): Promise<ParadexMarket | null> {
  return prisma.paradexMarket.findUnique({
    where: {
      symbol: symbol.toUpperCase(),
    },
  });
}
