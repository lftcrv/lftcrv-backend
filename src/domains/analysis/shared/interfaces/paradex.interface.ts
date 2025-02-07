export interface ParadexMarginParams {
  imf_base: string;
  imf_shift: string;
  imf_factor: string;
  mmf_factor: string;
}

export interface ParadexMarket {
  symbol: string;
  base_currency: string;
  quote_currency: string;
  settlement_currency: string;
  order_size_increment: string;
  price_tick_size: string;
  min_notional: string;
  open_at: number;
  expiry_at: number;
  asset_kind: string;
  market_kind: string;
  position_limit: string;
  price_bands_width: string;
  max_open_orders: number;
  max_funding_rate: string;
  delta1_cross_margin_params: ParadexMarginParams;
  price_feed_id: string;
  oracle_ewma_factor: string;
  max_order_size: string;
  max_funding_rate_change: string;
  max_tob_spread: string;
  interest_rate: string;
  clamp_rate: string;
  funding_period_hours: number;
}

export interface ParadexMarketsResponse {
  results: ParadexMarket[];
}
