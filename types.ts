
export enum AssetType {
  US_STOCK = 'US_STOCK',
  TW_STOCK = 'TW_STOCK',
  CASH = 'CASH',
  OTHER = 'OTHER'
}

export enum Currency {
  USD = 'USD',
  TWD = 'TWD',
  JPY = 'JPY'
}

export interface Asset {
  id: string;
  type: AssetType;
  symbol: string;
  shares: number;
  avgPrice: number;
  currency: Currency;
  name: string;
  currentPrice?: number;
  dailyChangePct?: number;
}

export interface MarketData {
  symbol: string;
  price: number;
  name: string;
  dailyChangePct: number;
}

export interface ExchangeRate {
  pair: string;
  rate: number;
}
