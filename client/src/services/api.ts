import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const axiosClient = axios.create({
  baseURL: API_BASE,
  timeout: 8000, // 8-second client timeout
});

export interface WatchlistItem {
  id: number;
  symbol: string;
  name: string;
  asset_type: 'stock' | 'crypto' | 'forex';
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  dayHigh: number;
  dayLow: number;
  timestamp: string;
  sparkline: number[];
  error?: string;
}

export interface SearchResult {
  symbol: string;
  name: string;
  assetType: 'stock' | 'crypto' | 'forex';
  exchange?: string;
}

export interface SearchResponse {
  stocks: SearchResult[];
  crypto: SearchResult[];
  forex: SearchResult[];
}

export interface QuoteData {
  symbol: string;
  normalizedSymbol: string;
  name: string;
  assetType: 'stock' | 'crypto' | 'forex';
  currency: string;
  price: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  prevClose: number;
  timestamp: string;
  exchange?: string;
  error?: string;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface VolumeBar {
  time: number;
  value: number;
  color: string;
}

export interface CandleResponse {
  candles: Candle[];
  volume: VolumeBar[];
  error?: string;
}

export interface MetricItem {
  label: string;
  value: string;
  description: string;
}

export interface KeyDataResponse {
  assetType: 'stock' | 'crypto' | 'forex';
  metrics: MetricItem[];
  error?: string;
}

export interface Article {
  id: string;
  title: string;
  source: string;
  snippet: string;
  link: string;
  timestamp: string;
}

export interface EconomicEvent {
  id: string;
  title: string;
  country: string;
  impact: string;
  date: string;
  forecast: string;
  previous: string;
  unit: string;
}

export interface NewsResponse {
  articles: Article[];
  events: EconomicEvent[];
  error?: string;
}

export interface Trade {
  id?: number;
  instrument: string;
  direction: 'long' | 'short';
  entry_price: number;
  entry_time: string;
  exit_price?: number | null;
  exit_time?: string | null;
  position_size: number;
  stop_loss?: number | null;
  target?: number | null;
  strategy_tag?: string;
  reasoning?: string;
  win_reason?: string;
  loss_reason?: string;
  voting_mode?: string | null;
  vote_tally?: string | null;
  vote_strength?: number | null;
  status: 'open' | 'closed';
  calculatedPnl?: number;
  calculatedPnlPercent?: number;
  riskRewardRatio?: number;
}

export interface EquityPoint {
  tradeIndex: number;
  time: string;
  pnl: number;
  cumulativePnl: number;
  instrument: string;
}

export interface TradeStats {
  totalTrades: number;
  closedTradesCount: number;
  openTradesCount: number;
  winRate: number;
  totalPnl: number;
  avgRR: number;
  bestTradePnl: number;
  worstTradePnl: number;
  highConsensusCount?: number;
  highConsensusWinRate?: number;
  splitConsensusCount?: number;
  splitConsensusWinRate?: number;
  equityCurve: EquityPoint[];
}

export const api = {
  // Watchlist
  getWatchlist: () => axiosClient.get<WatchlistItem[]>('/watchlist').then(res => res.data),
  addToWatchlist: (symbol: string, name: string, asset_type: string) => 
    axiosClient.post('/watchlist', { symbol, name, asset_type }).then(res => res.data),
  removeFromWatchlist: (id: number) => axiosClient.delete(`/watchlist/${id}`).then(res => res.data),

  // Instrument Search (autocomplete)
  searchInstruments: (q: string) =>
    axiosClient.get<SearchResponse>(`/market/search?q=${encodeURIComponent(q)}`).then(res => res.data),

  // Market & Research
  getQuote: (symbol: string, assetType: string) => 
    axiosClient.get<QuoteData>(`/market/quote/${symbol}?assetType=${assetType}`).then(res => res.data),
  getCandles: (symbol: string, assetType: string, timeframe: string) => 
    axiosClient.get<CandleResponse>(`/market/candles/${symbol}?assetType=${assetType}&timeframe=${timeframe}`).then(res => res.data),
  getKeyData: (symbol: string, assetType: string) => 
    axiosClient.get<KeyDataResponse>(`/market/keydata/${symbol}?assetType=${assetType}`).then(res => res.data),
  getNews: (symbol: string, assetType: string) => 
    axiosClient.get<NewsResponse>(`/market/news/${symbol}?assetType=${assetType}`).then(res => res.data),

  // Trade Journal
  getTrades: () => axiosClient.get<Trade[]>('/trades').then(res => res.data),
  getTradeStats: () => axiosClient.get<TradeStats>('/trades/stats').then(res => res.data),
  createTrade: (trade: Omit<Trade, 'id'>) => axiosClient.post<Trade>('/trades', trade).then(res => res.data),
  updateTrade: (id: number, trade: Partial<Trade>) => axiosClient.put<Trade>(`/trades/${id}`, trade).then(res => res.data),
  deleteTrade: (id: number) => axiosClient.delete(`/trades/${id}`).then(res => res.data),
};
