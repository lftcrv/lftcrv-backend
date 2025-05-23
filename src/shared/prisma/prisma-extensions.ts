import { PrismaClient } from '@prisma/client';

/**
 * Prisma Client Extension for dynamic portfolio calculations
 * Uses manual joins with TokenMaster instead of strict foreign keys
 */
export const portfolioExtension = {
  name: 'portfolio-calculations',
  model: {
    portfolioTokenBalance: {
      /**
       * Find portfolio token balance with current price from TokenMaster
       */
      async findManyWithPrices(this: any, args: any = {}) {
        const rawSql = `
          SELECT 
            ptb.*,
            COALESCE(tm.price_usd, 0) as current_price_usd,
            (ptb.amount::numeric * COALESCE(tm.price_usd, 0)) as calculated_value_usd
          FROM portfolio_token_balances ptb
          LEFT JOIN token_master tm ON ptb.token_symbol = tm.canonical_symbol
          ${args.where ? 'WHERE ' + this._buildWhereClause(args.where) : ''}
          ${args.orderBy ? 'ORDER BY ' + this._buildOrderClause(args.orderBy) : ''}
        `;

        return this.$queryRawUnsafe(rawSql);
      },
    },
    paradexAccountBalance: {
      /**
       * Find account balance with calculated total from token balances
       */
      async findManyWithCalculatedTotals(this: any, args: any = {}) {
        const rawSql = `
          SELECT 
            pab.*,
            COALESCE(token_totals.calculated_total_usd, 0) as calculated_balance_usd,
            token_totals.token_count
          FROM paradex_account_balances pab
          LEFT JOIN (
            SELECT 
              ptb.account_balance_id,
              SUM(ptb.amount::numeric * COALESCE(tm.price_usd, 0)) as calculated_total_usd,
              COUNT(*) as token_count
            FROM portfolio_token_balances ptb
            LEFT JOIN token_master tm ON ptb.token_symbol = tm.canonical_symbol
            GROUP BY ptb.account_balance_id
          ) token_totals ON pab.id = token_totals.account_balance_id
          ${args.where ? 'WHERE ' + this._buildWhereClause(args.where) : ''}
          ${args.orderBy ? 'ORDER BY ' + this._buildOrderClause(args.orderBy) : ''}
        `;

        return this.$queryRawUnsafe(rawSql);
      },
    },
  },
};

/**
 * Enhanced KPI Service methods using raw SQL for better performance
 */
export class PortfolioCalculationService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get account balance with real-time price calculations
   */
  async getAccountBalanceWithPrices(accountBalanceId: string) {
    const result = await this.prisma.$queryRaw`
      SELECT 
        pab.id,
        pab."agentId",
        pab."balanceInUSD" as stored_balance_usd,
        pab."createdAt",
        COALESCE(token_totals.calculated_total_usd, 0) as calculated_balance_usd,
        token_totals.token_count,
        json_agg(
          json_build_object(
            'symbol', ptb.token_symbol,
            'amount', ptb.amount,
            'stored_price_usd', ptb.price_usd,
            'current_price_usd', 
            CASE 
              WHEN ptb.token_symbol = 'USDC' THEN 1.00
              ELSE COALESCE(tm.price_usd, 0)
            END,
            'stored_value_usd', ptb.value_usd,
            'calculated_value_usd', 
            (ptb.amount::numeric * 
              CASE 
                WHEN ptb.token_symbol = 'USDC' THEN 1.00
                ELSE COALESCE(tm.price_usd, 0)
              END
            )
          )
        ) as token_details
      FROM paradex_account_balances pab
      LEFT JOIN portfolio_token_balances ptb ON pab.id = ptb.account_balance_id
      LEFT JOIN token_master tm ON ptb.token_symbol = tm.canonical_symbol
      LEFT JOIN (
        SELECT 
          ptb2.account_balance_id,
          SUM(ptb2.amount::numeric * 
            CASE 
              WHEN ptb2.token_symbol = 'USDC' THEN 1.00
              ELSE COALESCE(tm2.price_usd, 0)
            END
          ) as calculated_total_usd,
          COUNT(*) as token_count
        FROM portfolio_token_balances ptb2
        LEFT JOIN token_master tm2 ON ptb2.token_symbol = tm2.canonical_symbol
        GROUP BY ptb2.account_balance_id
      ) token_totals ON pab.id = token_totals.account_balance_id
      WHERE pab.id = ${accountBalanceId}
      GROUP BY pab.id, pab."agentId", pab."balanceInUSD", pab."createdAt", 
               token_totals.calculated_total_usd, token_totals.token_count
    `;

    return result[0] || null;
  }

  /**
   * Get latest account balance for an agent with calculations
   */
  async getLatestAgentBalance(agentId: string) {
    const result = await this.prisma.$queryRaw`
      WITH latest_balance AS (
        SELECT id, "agentId", "balanceInUSD", "createdAt"
        FROM paradex_account_balances 
        WHERE "agentId" = ${agentId}
        ORDER BY "createdAt" DESC 
        LIMIT 1
      )
      SELECT 
        lb.id,
        lb."agentId",
        lb."balanceInUSD" as stored_balance_usd,
        lb."createdAt",
        COALESCE(token_totals.calculated_total_usd, 0) as calculated_balance_usd,
        token_totals.token_count,
        json_agg(
          json_build_object(
            'symbol', ptb.token_symbol,
            'amount', ptb.amount,
            'stored_price_usd', ptb.price_usd,
            'current_price_usd', 
            CASE 
              WHEN ptb.token_symbol = 'USDC' THEN 1.00
              ELSE COALESCE(tm.price_usd, 0)
            END,
            'stored_value_usd', ptb.value_usd,
            'calculated_value_usd', 
            (ptb.amount::numeric * 
              CASE 
                WHEN ptb.token_symbol = 'USDC' THEN 1.00
                ELSE COALESCE(tm.price_usd, 0)
              END
            )
          )
        ) as token_details
      FROM latest_balance lb
      LEFT JOIN portfolio_token_balances ptb ON lb.id = ptb.account_balance_id
      LEFT JOIN token_master tm ON ptb.token_symbol = tm.canonical_symbol
      LEFT JOIN (
        SELECT 
          ptb2.account_balance_id,
          SUM(ptb2.amount::numeric * 
            CASE 
              WHEN ptb2.token_symbol = 'USDC' THEN 1.00
              ELSE COALESCE(tm2.price_usd, 0)
            END
          ) as calculated_total_usd,
          COUNT(*) as token_count
        FROM portfolio_token_balances ptb2
        LEFT JOIN token_master tm2 ON ptb2.token_symbol = tm2.canonical_symbol
        WHERE ptb2.account_balance_id = (SELECT id FROM latest_balance)
        GROUP BY ptb2.account_balance_id
      ) token_totals ON lb.id = token_totals.account_balance_id
      GROUP BY lb.id, lb."agentId", lb."balanceInUSD", lb."createdAt", 
               token_totals.calculated_total_usd, token_totals.token_count
    `;

    return result[0] || null;
  }

  /**
   * Get all account balances with calculations, ordered by calculated total
   */
  async getAllAccountBalancesWithCalculations() {
    return await this.prisma.$queryRaw`
      SELECT 
        pab.id,
        pab."agentId",
        pab."balanceInUSD" as stored_balance_usd,
        pab."createdAt",
        ea.name as agent_name,
        ea."runtimeAgentId",
        COALESCE(token_totals.calculated_total_usd, 0) as calculated_balance_usd,
        token_totals.token_count
      FROM paradex_account_balances pab
      LEFT JOIN eliza_agents ea ON pab."agentId" = ea.id
      LEFT JOIN (
        SELECT 
          ptb.account_balance_id,
          SUM(ptb.amount::numeric * 
            CASE 
              WHEN ptb.token_symbol = 'USDC' THEN 1.00
              ELSE COALESCE(tm.price_usd, 0)
            END
          ) as calculated_total_usd,
          COUNT(*) as token_count
        FROM portfolio_token_balances ptb
        LEFT JOIN token_master tm ON ptb.token_symbol = tm.canonical_symbol
        GROUP BY ptb.account_balance_id
      ) token_totals ON pab.id = token_totals.account_balance_id
      ORDER BY calculated_balance_usd DESC
    `;
  }
}

/**
 * Helper type for the enhanced calculation service
 */
export type EnhancedPortfolioClient = PrismaClient & {
  portfolioCalculations: PortfolioCalculationService;
};

/**
 * Factory function to create the enhanced Prisma Client
 */
export function createEnhancedPrismaClient(
  prisma: PrismaClient,
): EnhancedPortfolioClient {
  const enhanced = prisma as EnhancedPortfolioClient;
  enhanced.portfolioCalculations = new PortfolioCalculationService(prisma);
  return enhanced;
}
