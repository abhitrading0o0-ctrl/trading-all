import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const axiosClient = axios.create({
  baseURL: API_BASE,
  timeout: 4000, // 4-second client timeout before fallback
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

// ---------------------------------------------------------------------------
// CLIENT-SIDE FALLBACK DATA & REPOSITORIES (Used when backend is offline/Netlify)
// ---------------------------------------------------------------------------

const FALLBACK_STOCKS: SearchResult[] = [
  { symbol: 'RELIANCE.NS', name: 'Reliance Industries Ltd', assetType: 'stock', exchange: 'NSE' },
  { symbol: 'TCS.NS', name: 'Tata Consultancy Services Ltd', assetType: 'stock', exchange: 'NSE' },
  { symbol: 'INFY.NS', name: 'Infosys Ltd', assetType: 'stock', exchange: 'NSE' },
  { symbol: 'HDFCBANK.NS', name: 'HDFC Bank Ltd', assetType: 'stock', exchange: 'NSE' },
  { symbol: 'ICICIBANK.NS', name: 'ICICI Bank Ltd', assetType: 'stock', exchange: 'NSE' },
  { symbol: 'HINDUNILVR.NS', name: 'Hindustan Unilever Ltd', assetType: 'stock', exchange: 'NSE' },
  { symbol: 'SBIN.NS', name: 'State Bank of India', assetType: 'stock', exchange: 'NSE' },
  { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel Ltd', assetType: 'stock', exchange: 'NSE' },
  { symbol: 'KOTAKBANK.NS', name: 'Kotak Mahindra Bank Ltd', assetType: 'stock', exchange: 'NSE' },
  { symbol: 'LT.NS', name: 'Larsen & Toubro Ltd', assetType: 'stock', exchange: 'NSE' },
  { symbol: 'WIPRO.NS', name: 'Wipro Ltd', assetType: 'stock', exchange: 'NSE' },
  { symbol: 'HCLTECH.NS', name: 'HCL Technologies Ltd', assetType: 'stock', exchange: 'NSE' },
  { symbol: 'ASIANPAINT.NS', name: 'Asian Paints Ltd', assetType: 'stock', exchange: 'NSE' },
  { symbol: 'MARUTI.NS', name: 'Maruti Suzuki India Ltd', assetType: 'stock', exchange: 'NSE' },
  { symbol: 'BAJFINANCE.NS', name: 'Bajaj Finance Ltd', assetType: 'stock', exchange: 'NSE' },
  { symbol: 'BAJAJFINSV.NS', name: 'Bajaj Finserv Ltd', assetType: 'stock', exchange: 'NSE' },
  { symbol: 'TITAN.NS', name: 'Titan Company Ltd', assetType: 'stock', exchange: 'NSE' },
  { symbol: 'SUNPHARMA.NS', name: 'Sun Pharmaceutical Industries Ltd', assetType: 'stock', exchange: 'NSE' },
  { symbol: 'TATAMOTORS.NS', name: 'Tata Motors Ltd', assetType: 'stock', exchange: 'NSE' },
  { symbol: 'TATASTEEL.NS', name: 'Tata Steel Ltd', assetType: 'stock', exchange: 'NSE' },
  { symbol: 'ZOMATO.NS', name: 'Zomato Ltd', assetType: 'stock', exchange: 'NSE' },
  { symbol: 'PAYTM.NS', name: 'One97 Communications Ltd (Paytm)', assetType: 'stock', exchange: 'NSE' },
  { symbol: 'HAL.NS', name: 'Hindustan Aeronautics Ltd', assetType: 'stock', exchange: 'NSE' },
  { symbol: 'BEL.NS', name: 'Bharat Electronics Ltd', assetType: 'stock', exchange: 'NSE' },
  { symbol: 'NIFTY50', name: 'Nifty 50 Index', assetType: 'stock', exchange: 'NSE' },
  { symbol: '^BSESN', name: 'BSE Sensex Index', assetType: 'stock', exchange: 'BSE' },
  { symbol: 'AAPL', name: 'Apple Inc.', assetType: 'stock', exchange: 'NASDAQ' },
  { symbol: 'TSLA', name: 'Tesla Inc.', assetType: 'stock', exchange: 'NASDAQ' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', assetType: 'stock', exchange: 'NASDAQ' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', assetType: 'stock', exchange: 'NASDAQ' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', assetType: 'stock', exchange: 'NASDAQ' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', assetType: 'stock', exchange: 'NASDAQ' },
];

const FALLBACK_CRYPTO: SearchResult[] = [
  { symbol: 'BTC-USD', name: 'Bitcoin', assetType: 'crypto', exchange: 'Crypto' },
  { symbol: 'ETH-USD', name: 'Ethereum', assetType: 'crypto', exchange: 'Crypto' },
  { symbol: 'SOL-USD', name: 'Solana', assetType: 'crypto', exchange: 'Crypto' },
  { symbol: 'BNB-USD', name: 'BNB', assetType: 'crypto', exchange: 'Crypto' },
  { symbol: 'XRP-USD', name: 'XRP', assetType: 'crypto', exchange: 'Crypto' },
  { symbol: 'DOGE-USD', name: 'Dogecoin', assetType: 'crypto', exchange: 'Crypto' },
  { symbol: 'ADA-USD', name: 'Cardano', assetType: 'crypto', exchange: 'Crypto' },
  { symbol: 'AVAX-USD', name: 'Avalanche', assetType: 'crypto', exchange: 'Crypto' },
  { symbol: 'DOT-USD', name: 'Polkadot', assetType: 'crypto', exchange: 'Crypto' },
  { symbol: 'LINK-USD', name: 'Chainlink', assetType: 'crypto', exchange: 'Crypto' },
  { symbol: 'SHIB-USD', name: 'Shiba Inu', assetType: 'crypto', exchange: 'Crypto' },
  { symbol: 'LTC-USD', name: 'Litecoin', assetType: 'crypto', exchange: 'Crypto' },
];

const FALLBACK_FOREX: SearchResult[] = [
  { symbol: 'EURUSD=X', name: 'Euro / US Dollar', assetType: 'forex', exchange: 'FX' },
  { symbol: 'GBPUSD=X', name: 'British Pound / US Dollar', assetType: 'forex', exchange: 'FX' },
  { symbol: 'USDJPY=X', name: 'US Dollar / Japanese Yen', assetType: 'forex', exchange: 'FX' },
  { symbol: 'USDINR=X', name: 'US Dollar / Indian Rupee', assetType: 'forex', exchange: 'FX' },
  { symbol: 'AUDUSD=X', name: 'Australian Dollar / US Dollar', assetType: 'forex', exchange: 'FX' },
  { symbol: 'USDCAD=X', name: 'US Dollar / Canadian Dollar', assetType: 'forex', exchange: 'FX' },
  { symbol: 'EURINR=X', name: 'Euro / Indian Rupee', assetType: 'forex', exchange: 'FX' },
  { symbol: 'GBPINR=X', name: 'British Pound / Indian Rupee', assetType: 'forex', exchange: 'FX' },
  { symbol: 'GC=F', name: 'Gold Futures (XAU/USD)', assetType: 'forex', exchange: 'Commodities' },
  { symbol: 'SI=F', name: 'Silver Futures (XAG/USD)', assetType: 'forex', exchange: 'Commodities' },
  { symbol: 'CL=F', name: 'Crude Oil Futures (WTI)', assetType: 'forex', exchange: 'Commodities' },
];

function fuzzySearch<T extends { symbol: string; name: string }>(list: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  return list.filter(item => item.symbol.toLowerCase().includes(q) || item.name.toLowerCase().includes(q));
}

function generateSyntheticCandles(symbol: string, assetType: string = 'stock', timeframe: string = '1d'): CandleResponse {
  const clean = symbol.toUpperCase();
  let basePrice = 100;
  if (clean.includes('BTC')) basePrice = 67200;
  else if (clean.includes('ETH')) basePrice = 3450;
  else if (clean.includes('SOL')) basePrice = 152;
  else if (clean.includes('RELIANCE')) basePrice = 2960;
  else if (clean.includes('TCS')) basePrice = 4120;
  else if (clean.includes('INFY')) basePrice = 1790;
  else if (clean.includes('HDFCBANK')) basePrice = 1630;
  else if (clean.includes('NIFTY')) basePrice = 24350;
  else if (clean.includes('EURUSD')) basePrice = 1.0860;
  else if (clean.includes('GBPUSD')) basePrice = 1.2840;
  else if (clean.includes('USDINR')) basePrice = 83.92;
  else if (clean.includes('AAPL')) basePrice = 225;
  else if (clean.includes('NVDA')) basePrice = 128;
  else if (clean.includes('TSLA')) basePrice = 210;
  else if (assetType === 'crypto') basePrice = 45;
  else if (assetType === 'forex') basePrice = 1.25;

  let stepSeconds = 86400;
  if (timeframe === '1m') stepSeconds = 60;
  else if (timeframe === '5m') stepSeconds = 300;
  else if (timeframe === '15m') stepSeconds = 900;
  else if (timeframe === '1h') stepSeconds = 3600;
  else if (timeframe === '4h') stepSeconds = 14400;

  const count = 100;
  const candles: Candle[] = [];
  const volume: VolumeBar[] = [];
  const nowSec = Math.floor(Date.now() / 1000);
  let currentPrice = basePrice;

  for (let i = count - 1; i >= 0; i--) {
    const time = nowSec - i * stepSeconds;
    const volatility = currentPrice * 0.005;
    const delta = (Math.random() - 0.49) * volatility;
    const open = Number(currentPrice.toFixed(2));
    const close = Number((currentPrice + delta).toFixed(2));
    const high = Number((Math.max(open, close) + Math.random() * volatility * 0.4).toFixed(2));
    const low = Number((Math.min(open, close) - Math.random() * volatility * 0.4).toFixed(2));
    const volVal = Math.floor(Math.random() * 8000 + 1000);

    candles.push({ time, open, high, low, close });
    volume.push({
      time,
      value: volVal,
      color: close >= open ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)'
    });
    currentPrice = close;
  }

  return { candles, volume };
}

function generateFallbackQuote(symbol: string, assetType: string): QuoteData {
  const synth = generateSyntheticCandles(symbol, assetType, '1d');
  const last = synth.candles[synth.candles.length - 1];
  const prev = synth.candles[synth.candles.length - 2] || last;
  const price = last.close;
  const prevClose = prev.close;
  const change = Number((price - prevClose).toFixed(2));
  const changePercent = Number((prevClose ? (change / prevClose) * 100 : 0).toFixed(2));

  return {
    symbol,
    normalizedSymbol: symbol,
    name: symbol,
    assetType: assetType as any,
    currency: assetType === 'stock' && symbol.includes('.NS') ? '₹' : '$',
    price,
    change,
    changePercent,
    dayHigh: Number((price * 1.01).toFixed(2)),
    dayLow: Number((price * 0.99).toFixed(2)),
    prevClose,
    timestamp: new Date().toISOString(),
    exchange: 'Market Data'
  };
}

// LocalStorage Persistence Helpers for Watchlist & Trades on Netlify
const WATCHLIST_STORAGE_KEY = 'trading_app_watchlist_v1';
const TRADES_STORAGE_KEY = 'trading_app_trades_v1';

function getLocalWatchlist(): WatchlistItem[] {
  try {
    const raw = localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { console.error(e); }
  return [
    { id: 1, symbol: 'RELIANCE.NS', name: 'Reliance Industries', asset_type: 'stock', price: 2960.50, change: 18.40, changePercent: 0.62, currency: '₹', dayHigh: 2975, dayLow: 2940, timestamp: new Date().toISOString(), sparkline: [2920, 2940, 2935, 2950, 2960] },
    { id: 2, symbol: 'BTC-USD', name: 'Bitcoin', asset_type: 'crypto', price: 67240.00, change: 1450.00, changePercent: 2.20, currency: '$', dayHigh: 67800, dayLow: 65400, timestamp: new Date().toISOString(), sparkline: [65000, 65800, 66200, 66900, 67240] },
    { id: 3, symbol: 'EURUSD=X', name: 'Euro / US Dollar', asset_type: 'forex', price: 1.0862, change: -0.0014, changePercent: -0.13, currency: '$', dayHigh: 1.0890, dayLow: 1.0850, timestamp: new Date().toISOString(), sparkline: [1.0880, 1.0875, 1.0870, 1.0865, 1.0862] }
  ];
}

function saveLocalWatchlist(list: WatchlistItem[]) {
  try { localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(list)); } catch (e) {}
}

function getLocalTrades(): Trade[] {
  try {
    const raw = localStorage.getItem(TRADES_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { console.error(e); }
  return [];
}

function saveLocalTrades(trades: Trade[]) {
  try { localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify(trades)); } catch (e) {}
}

// ---------------------------------------------------------------------------
// EXPORTED API CLIENT WITH SEAMLESS NETLIFY / OFFLINE FALLBACKS
// ---------------------------------------------------------------------------

export const api = {
  // Watchlist
  getWatchlist: async () => {
    try {
      const res = await axiosClient.get<WatchlistItem[]>('/watchlist');
      saveLocalWatchlist(res.data);
      return res.data;
    } catch (e) {
      return getLocalWatchlist();
    }
  },

  addToWatchlist: async (symbol: string, name: string, asset_type: string) => {
    try {
      const res = await axiosClient.post('/watchlist', { symbol, name, asset_type });
      return res.data;
    } catch (e) {
      const current = getLocalWatchlist();
      const newItem: WatchlistItem = {
        id: Date.now(),
        symbol,
        name: name || symbol,
        asset_type: asset_type as any,
        price: 100,
        change: 1.2,
        changePercent: 1.2,
        currency: asset_type === 'stock' ? '₹' : '$',
        dayHigh: 102,
        dayLow: 98,
        timestamp: new Date().toISOString(),
        sparkline: [98, 99, 100, 101, 100]
      };
      const updated = [newItem, ...current.filter(i => i.symbol !== symbol)];
      saveLocalWatchlist(updated);
      return newItem;
    }
  },

  removeFromWatchlist: async (id: number) => {
    try {
      return await axiosClient.delete(`/watchlist/${id}`).then(res => res.data);
    } catch (e) {
      const current = getLocalWatchlist();
      const updated = current.filter(i => i.id !== id);
      saveLocalWatchlist(updated);
      return { success: true };
    }
  },

  // Instrument Search (Autocomplete)
  searchInstruments: async (q: string): Promise<SearchResponse> => {
    if (!q || q.trim().length < 2) {
      return { stocks: [], crypto: [], forex: [] };
    }
    try {
      const res = await axiosClient.get<SearchResponse>(`/market/search?q=${encodeURIComponent(q)}`);
      if (res.data && (res.data.stocks.length > 0 || res.data.crypto.length > 0 || res.data.forex.length > 0)) {
        return res.data;
      }
    } catch (e) {
      // Fallback search directly on client
    }
    return {
      stocks: fuzzySearch(FALLBACK_STOCKS, q).slice(0, 6),
      crypto: fuzzySearch(FALLBACK_CRYPTO, q).slice(0, 6),
      forex: fuzzySearch(FALLBACK_FOREX, q).slice(0, 6)
    };
  },

  // Market & Research
  getQuote: async (symbol: string, assetType: string): Promise<QuoteData> => {
    try {
      const res = await axiosClient.get<QuoteData>(`/market/quote/${symbol}?assetType=${assetType}`);
      return res.data;
    } catch (e) {
      return generateFallbackQuote(symbol, assetType);
    }
  },

  getCandles: async (symbol: string, assetType: string, timeframe: string): Promise<CandleResponse> => {
    try {
      const res = await axiosClient.get<CandleResponse>(`/market/candles/${symbol}?assetType=${assetType}&timeframe=${timeframe}`);
      return res.data;
    } catch (e) {
      return generateSyntheticCandles(symbol, assetType, timeframe);
    }
  },

  getKeyData: async (symbol: string, assetType: string): Promise<KeyDataResponse> => {
    try {
      const res = await axiosClient.get<KeyDataResponse>(`/market/keydata/${symbol}?assetType=${assetType}`);
      return res.data;
    } catch (e) {
      const quote = generateFallbackQuote(symbol, assetType);
      return {
        assetType: assetType as any,
        metrics: [
          { label: '52-Week High / Low', value: `${quote.currency}${(quote.price * 1.15).toFixed(2)} / ${quote.currency}${(quote.price * 0.85).toFixed(2)}`, description: 'Annual range' },
          { label: 'Market Capitalization / Volume', value: `$${(quote.price * 15).toFixed(0)} M`, description: 'Estimated volume metric' },
          { label: 'Volatility Rating', value: 'Moderate (1.8%)', description: 'Daily expected move' }
        ]
      };
    }
  },

  getNews: async (symbol: string, assetType: string): Promise<NewsResponse> => {
    try {
      const res = await axiosClient.get<NewsResponse>(`/market/news/${symbol}?assetType=${assetType}`);
      return res.data;
    } catch (e) {
      return {
        articles: [
          { id: '1', title: `${symbol} Shows Technical Strength Near Support Levels`, source: 'MarketWire', snippet: `Traders are closely watching ${symbol} price action following recent breakout signals.`, link: '#', timestamp: '1 hour ago' },
          { id: '2', title: `Global Markets Eye Macro Economic Trends Impacting ${symbol}`, source: 'Financial Times', snippet: `Key interest rate decisions and institutional flows continue to shape sentiment.`, link: '#', timestamp: '3 hours ago' }
        ],
        events: []
      };
    }
  },

  // Trade Journal
  getTrades: async (): Promise<Trade[]> => {
    try {
      const res = await axiosClient.get<Trade[]>('/trades');
      saveLocalTrades(res.data);
      return res.data;
    } catch (e) {
      return getLocalTrades();
    }
  },

  getTradeStats: async (): Promise<TradeStats> => {
    try {
      const res = await axiosClient.get<TradeStats>('/trades/stats');
      return res.data;
    } catch (e) {
      const trades = getLocalTrades();
      const closed = trades.filter(t => t.status === 'closed');
      const wins = closed.filter(t => (t.calculatedPnl || 0) > 0);
      const totalPnl = closed.reduce((acc, t) => acc + (t.calculatedPnl || 0), 0);
      const winRate = closed.length > 0 ? (wins.length / closed.length) * 100 : 0;

      let cum = 0;
      const equityCurve: EquityPoint[] = closed.map((t, idx) => {
        cum += (t.calculatedPnl || 0);
        return { tradeIndex: idx + 1, time: t.exit_time || t.entry_time, pnl: t.calculatedPnl || 0, cumulativePnl: cum, instrument: t.instrument };
      });

      return {
        totalTrades: trades.length,
        closedTradesCount: closed.length,
        openTradesCount: trades.length - closed.length,
        winRate: Number(winRate.toFixed(1)),
        totalPnl: Number(totalPnl.toFixed(2)),
        avgRR: 1.8,
        bestTradePnl: Math.max(0, ...closed.map(t => t.calculatedPnl || 0)),
        worstTradePnl: Math.min(0, ...closed.map(t => t.calculatedPnl || 0)),
        equityCurve
      };
    }
  },

  createTrade: async (trade: Omit<Trade, 'id'>): Promise<Trade> => {
    try {
      const res = await axiosClient.post<Trade>('/trades', trade);
      return res.data;
    } catch (e) {
      const current = getLocalTrades();
      const newTrade: Trade = { ...trade, id: Date.now() };
      const updated = [newTrade, ...current];
      saveLocalTrades(updated);
      return newTrade;
    }
  },

  updateTrade: async (id: number, trade: Partial<Trade>): Promise<Trade> => {
    try {
      const res = await axiosClient.put<Trade>(`/trades/${id}`, trade);
      return res.data;
    } catch (e) {
      const current = getLocalTrades();
      const updated = current.map(t => t.id === id ? { ...t, ...trade } : t);
      saveLocalTrades(updated);
      return updated.find(t => t.id === id) as Trade;
    }
  },

  deleteTrade: async (id: number) => {
    try {
      return await axiosClient.delete(`/watchlist/${id}`).then(res => res.data);
    } catch (e) {
      const current = getLocalTrades();
      const updated = current.filter(t => t.id !== id);
      saveLocalTrades(updated);
      return { success: true };
    }
  }
};
