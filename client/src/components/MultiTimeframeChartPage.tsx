import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { QuoteData, Candle, VolumeBar } from '../services/api';
import { LightweightChart } from './LightweightChart';
import {
  Search, ArrowUpRight, ArrowDownRight, Clock,
  RefreshCw, ExternalLink, Cpu, Sliders, AlertCircle
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export interface MultiTimeframeChartPageProps {
  symbol?: string;
  assetType?: 'stock' | 'crypto' | 'forex';
  isEmbedded?: boolean;
  onSelectSymbol?: (symbol: string, assetType: 'stock' | 'crypto' | 'forex') => void;
  onNavigateToResearch?: (symbol: string, assetType: 'stock' | 'crypto' | 'forex') => void;
  onNavigateToVoting?: (symbol: string, assetType: 'stock' | 'crypto' | 'forex', mode: 'day' | 'swing' | 'investing') => void;
}

const ASSET_SYMBOLS = {
  stock: [
    { symbol: 'RELIANCE.NS', name: 'Reliance Industries' },
    { symbol: 'TATASTEEL.NS', name: 'Tata Steel Ltd' },
    { symbol: 'INFY.NS', name: 'Infosys Ltd' },
    { symbol: 'TCS.NS', name: 'Tata Consultancy Services' },
    { symbol: 'HDFCBANK.NS', name: 'HDFC Bank Ltd' },
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'MSFT', name: 'Microsoft Corp.' },
    { symbol: 'TSLA', name: 'Tesla Inc.' },
  ],
  crypto: [
    { symbol: 'BTC-USD', name: 'Bitcoin (BTC/USD)' },
    { symbol: 'ETH-USD', name: 'Ethereum (ETH/USD)' },
    { symbol: 'SOL-USD', name: 'Solana (SOL/USD)' },
    { symbol: 'BNB-USD', name: 'Binance Coin (BNB/USD)' },
  ],
  forex: [
    { symbol: 'EURUSD=X', name: 'EUR / USD' },
    { symbol: 'GBPUSD=X', name: 'GBP / USD' },
    { symbol: 'USDJPY=X', name: 'USD / JPY' },
    { symbol: 'USDINR=X', name: 'USD / INR' },
  ],
};

const TIMEFRAMES = [
  { id: '1m', label: '1M', description: '1 Minute Intraday Bar' },
  { id: '5m', label: '5M', description: '5 Minute Intraday Bar' },
  { id: '15m', label: '15M', description: '15 Minute Intraday Bar' },
  { id: '1h', label: '1H', description: '1 Hour Hourly Bar' },
  { id: '4h', label: '4H', description: '4 Hour Swing Bar' },
  { id: '1d', label: '1D', description: 'Daily Bar' },
  { id: '1w', label: '1W', description: 'Weekly Bar' },
];

export const MultiTimeframeChartPage: React.FC<MultiTimeframeChartPageProps> = ({
  symbol: initialSymbol = 'RELIANCE.NS',
  assetType: initialAssetType = 'stock',
  isEmbedded = false,
  onSelectSymbol,
  onNavigateToResearch,
  onNavigateToVoting
}) => {
  const { theme } = useTheme();

  const [selectedAssetType, setSelectedAssetType] = useState<'stock' | 'crypto' | 'forex'>(initialAssetType);
  const [selectedSymbol, setSelectedSymbol] = useState<string>(initialSymbol);

  // Timeframe memory per asset class stored in localStorage
  const [timeframe, setTimeframe] = useState<string>(() => {
    return localStorage.getItem(`trading_tf_${initialAssetType}`) || (initialAssetType === 'stock' ? '1d' : '5m');
  });

  // Data telemetry state
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [volume, setVolume] = useState<VolumeBar[]>([]);
  const [dataTimestamp, setDataTimestamp] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Indicator Overlay Toggles (Persisted in localStorage)
  const [showMA20, setShowMA20] = useState<boolean>(() => localStorage.getItem('chart_ma20') !== 'false');
  const [showMA50, setShowMA50] = useState<boolean>(() => localStorage.getItem('chart_ma50') !== 'false');
  const [showMA200, setShowMA200] = useState<boolean>(() => localStorage.getItem('chart_ma200') === 'true');
  const [showRSI, setShowRSI] = useState<boolean>(() => localStorage.getItem('chart_rsi') !== 'false');
  const [showMACD, setShowMACD] = useState<boolean>(() => localStorage.getItem('chart_macd') === 'true');
  const [showVWAP, setShowVWAP] = useState<boolean>(() => localStorage.getItem('chart_vwap') !== 'false');
  const [showBollingerBands, setShowBollingerBands] = useState<boolean>(() => localStorage.getItem('chart_bollinger') === 'true');
  const [showVolume, setShowVolume] = useState<boolean>(() => localStorage.getItem('chart_volume') !== 'false');

  // Sync indicator settings to localStorage
  useEffect(() => {
    localStorage.setItem('chart_ma20', String(showMA20));
    localStorage.setItem('chart_ma50', String(showMA50));
    localStorage.setItem('chart_ma200', String(showMA200));
    localStorage.setItem('chart_rsi', String(showRSI));
    localStorage.setItem('chart_macd', String(showMACD));
    localStorage.setItem('chart_vwap', String(showVWAP));
    localStorage.setItem('chart_bollinger', String(showBollingerBands));
    localStorage.setItem('chart_volume', String(showVolume));
  }, [showMA20, showMA50, showMA200, showRSI, showMACD, showVWAP, showBollingerBands, showVolume]);

  // Update timeframe state when asset type changes, reading from asset memory
  const handleAssetTypeChange = (newAssetType: 'stock' | 'crypto' | 'forex') => {
    setSelectedAssetType(newAssetType);
    const defaultSym = ASSET_SYMBOLS[newAssetType][0].symbol;
    setSelectedSymbol(defaultSym);
    if (onSelectSymbol) onSelectSymbol(defaultSym, newAssetType);

    const savedTf = localStorage.getItem(`trading_tf_${newAssetType}`);
    const nextTf = savedTf || (newAssetType === 'stock' ? '1d' : '5m');
    setTimeframe(nextTf);
  };

  const handleSymbolChange = (newSym: string) => {
    setSelectedSymbol(newSym);
    if (onSelectSymbol) onSelectSymbol(newSym, selectedAssetType);
  };

  const handleTimeframeChange = (newTf: string) => {
    setTimeframe(newTf);
    localStorage.setItem(`trading_tf_${selectedAssetType}`, newTf);
  };

  const fetchChartData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [quoteRes, candleRes] = await Promise.all([
        api.getQuote(selectedSymbol, selectedAssetType),
        api.getCandles(selectedSymbol, selectedAssetType, timeframe)
      ]);

      if (candleRes.error) {
        setErrorMsg(candleRes.error);
      } else {
        setQuote(quoteRes);
        setCandles(candleRes.candles || []);
        setVolume(candleRes.volume || []);
        setDataTimestamp(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' IST');
      }
    } catch (err: any) {
      console.error('Error fetching chart data:', err);
      setErrorMsg("Couldn't load chart data — try again in a moment");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChartData();
  }, [selectedSymbol, selectedAssetType, timeframe]);

  const isPositive = (quote?.change ?? 0) >= 0;

  // Determine contextually relevant Strategy Voting mode based on current timeframe
  const getContextualVotingMode = (): 'day' | 'swing' | 'investing' => {
    if (timeframe === '1m' || timeframe === '5m' || timeframe === '15m') return 'day';
    if (timeframe === '1h' || timeframe === '4h' || timeframe === '1d') return 'swing';
    return 'investing';
  };

  const handleJumpToVoting = () => {
    const targetMode = getContextualVotingMode();
    if (onNavigateToVoting) {
      onNavigateToVoting(selectedSymbol, selectedAssetType, targetMode);
    }
  };

  const handleJumpToResearch = () => {
    if (onNavigateToResearch) {
      onNavigateToResearch(selectedSymbol, selectedAssetType);
    }
  };

  // Check timeframe disability logic (e.g. 1m for forex feeds)
  const isTimeframeDisabled = (tfId: string): { disabled: boolean; reason?: string } => {
    if (selectedAssetType === 'forex' && tfId === '1m') {
      return { disabled: true, reason: '1-minute candles are not supported on free forex data feeds' };
    }
    return { disabled: false };
  };

  const isIntradayTimeframe = timeframe !== '1d' && timeframe !== '1w';

  return (
    <div className={`space-y-4 font-mono animate-tab-fade ${isEmbedded ? '' : 'w-full'}`}>
      {/* Top Asset & Symbol Selector Bar */}
      <div className={`terminal-card p-4 border-l-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 ${
        theme === 'light' ? 'border-l-blue-600 bg-white shadow-xs' : 'border-l-blue-500 bg-[#05070a]'
      }`}>
        {/* Left Selector Inputs */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className={`flex items-center gap-1 p-1 rounded border text-xs ${
            theme === 'light' ? 'bg-slate-100 border-slate-300' : 'bg-dark-950 border-dark-800'
          }`}>
            <span className={`text-[10px] px-1 uppercase font-bold ${theme === 'light' ? 'text-slate-600' : 'text-slate-500'}`}>ASSET TYPE:</span>
            <button
              onClick={() => handleAssetTypeChange('stock')}
              className={`px-3 py-1 rounded text-xs transition-colors font-bold ${
                selectedAssetType === 'stock'
                  ? (theme === 'light' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-amber-950 text-amber-300 border border-amber-800')
                  : (theme === 'light' ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-200' : 'text-slate-400 hover:text-white')
              }`}
            >
              Stock
            </button>
            <button
              onClick={() => handleAssetTypeChange('crypto')}
              className={`px-3 py-1 rounded text-xs transition-colors font-bold ${
                selectedAssetType === 'crypto'
                  ? (theme === 'light' ? 'bg-purple-100 text-purple-900 border border-purple-300' : 'bg-purple-950 text-purple-300 border border-purple-800')
                  : (theme === 'light' ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-200' : 'text-slate-400 hover:text-white')
              }`}
            >
              Crypto
            </button>
            <button
              onClick={() => handleAssetTypeChange('forex')}
              className={`px-3 py-1 rounded text-xs transition-colors font-bold ${
                selectedAssetType === 'forex'
                  ? (theme === 'light' ? 'bg-cyan-100 text-cyan-900 border border-cyan-300' : 'bg-cyan-950 text-cyan-300 border border-cyan-800')
                  : (theme === 'light' ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-200' : 'text-slate-400 hover:text-white')
              }`}
            >
              Forex
            </button>
          </div>

          {/* Symbol Select Dropdown */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs ${
            theme === 'light' ? 'bg-slate-100 border-slate-300' : 'bg-dark-950 border-dark-800'
          }`}>
            <Search className={`w-3.5 h-3.5 ${theme === 'light' ? 'text-blue-600' : 'text-cyan-400'}`} />
            <select
              value={selectedSymbol}
              onChange={e => handleSymbolChange(e.target.value)}
              className={`bg-transparent font-bold focus:outline-none cursor-pointer text-xs ${
                theme === 'light' ? 'text-slate-900' : 'text-slate-200'
              }`}
            >
              {ASSET_SYMBOLS[selectedAssetType].map(item => (
                <option key={item.symbol} value={item.symbol} className={theme === 'light' ? 'bg-white text-slate-900' : 'bg-dark-900 text-slate-200'}>
                  {item.symbol} — {item.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Persistent Telemetry Price Header */}
        <div className={`flex flex-wrap items-center gap-6 w-full lg:w-auto justify-between lg:justify-end border-t lg:border-t-0 pt-3 lg:pt-0 ${
          theme === 'light' ? 'border-slate-200' : 'border-dark-800'
        }`}>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-base font-bold ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>
                {selectedSymbol}
              </span>
              <span className={`text-[10px] truncate max-w-[140px] ${theme === 'light' ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
                {quote?.name || selectedSymbol}
              </span>
            </div>
            <span className={`text-[10px] block flex items-center gap-1 ${theme === 'light' ? 'text-slate-600 font-medium' : 'text-slate-500'}`}>
              <Clock className="w-3 h-3 text-slate-500" />
              as of {dataTimestamp || 'live'}
            </span>
          </div>

          <div>
            <span className={`text-[10px] uppercase block font-semibold ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>PRICE</span>
            <div className={`text-xl font-bold ${isPositive ? (theme === 'light' ? 'text-emerald-700' : 'text-emerald-400') : (theme === 'light' ? 'text-rose-700' : 'text-rose-400')}`}>
              {quote?.currency === 'INR' ? '₹' : '$'}{quote?.price?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div>
            <span className={`text-[10px] uppercase block font-semibold ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>24H CHANGE</span>
            <div className={`text-xs font-bold flex items-center gap-0.5 ${isPositive ? (theme === 'light' ? 'text-emerald-700' : 'text-emerald-400') : (theme === 'light' ? 'text-rose-700' : 'text-rose-400')}`}>
              {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {isPositive ? '+' : ''}{quote?.changePercent?.toFixed(2)}%
            </div>
          </div>

          {/* Action Links */}
          <div className="flex items-center gap-2">
            {onNavigateToResearch && (
              <button
                onClick={handleJumpToResearch}
                className={`px-2.5 py-1 rounded text-xs border transition-colors flex items-center gap-1 font-semibold ${
                  theme === 'light' ? 'bg-slate-100 border-slate-300 text-blue-700 hover:bg-slate-200' : 'bg-dark-900 border-dark-700 text-cyan-400 hover:border-cyan-400'
                }`}
                title="Open full research page"
              >
                Research <ExternalLink className="w-3 h-3" />
              </button>
            )}

            {onNavigateToVoting && (
              <button
                onClick={handleJumpToVoting}
                className={`px-2.5 py-1 rounded text-xs border transition-colors flex items-center gap-1 font-bold ${
                  theme === 'light' ? 'bg-blue-600 border-blue-700 text-white shadow-xs hover:bg-blue-700' : 'bg-cyan-950 border-cyan-800 text-cyan-300 hover:bg-cyan-900'
                }`}
                title={`Open Strategy Voting Panel in ${getContextualVotingMode().toUpperCase()} mode`}
              >
                <Cpu className="w-3 h-3" />
                Voting Panel ({getContextualVotingMode().toUpperCase()})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Chart Card Viewport */}
      <div className="terminal-card p-4 space-y-3">
        {/* Timeframe & Overlay Toolbar */}
        <div className={`flex flex-wrap items-center justify-between gap-3 pb-3 border-b ${theme === 'light' ? 'border-slate-200' : 'border-dark-800'}`}>
          {/* Timeframe Switcher Buttons */}
          <div className={`flex items-center gap-1 p-1 rounded border text-xs ${theme === 'light' ? 'bg-slate-100 border-slate-300' : 'bg-dark-950 border-dark-800'}`}>
            <span className={`text-[10px] px-1 font-mono font-bold uppercase ${theme === 'light' ? 'text-slate-600' : 'text-slate-500'}`}>TIMEFRAME:</span>
            {TIMEFRAMES.map(tf => {
              const { disabled, reason } = isTimeframeDisabled(tf.id);
              const isActive = timeframe === tf.id;

              return (
                <button
                  key={tf.id}
                  disabled={disabled}
                  onClick={() => handleTimeframeChange(tf.id)}
                  title={disabled ? reason : tf.description}
                  className={`px-2.5 py-1 rounded text-xs transition-colors font-bold ${
                    isActive
                      ? theme === 'light'
                        ? 'bg-blue-600 text-white shadow'
                        : 'bg-blue-600 text-white shadow'
                      : disabled
                        ? 'text-slate-400 cursor-not-allowed opacity-50'
                        : theme === 'light'
                          ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
                          : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tf.label}
                </button>
              );
            })}
          </div>

          {/* Indicator Overlays Toggles */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={`text-[10px] flex items-center gap-1 font-bold ${theme === 'light' ? 'text-slate-600' : 'text-slate-500'}`}>
              <Sliders className={`w-3 h-3 ${theme === 'light' ? 'text-blue-600' : 'text-cyan-400'}`} />
              INDICATORS:
            </span>

            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={showMA20}
                onChange={e => setShowMA20(e.target.checked)}
                className="accent-cyan-500"
              />
              <span className={`font-mono text-[11px] font-bold ${theme === 'light' ? 'text-cyan-700' : 'text-cyan-400'}`}>MA20</span>
            </label>

            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={showMA50}
                onChange={e => setShowMA50(e.target.checked)}
                className="accent-amber-500"
              />
              <span className={`font-mono text-[11px] font-bold ${theme === 'light' ? 'text-amber-700' : 'text-amber-400'}`}>MA50</span>
            </label>

            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={showMA200}
                onChange={e => setShowMA200(e.target.checked)}
                className="accent-purple-500"
              />
              <span className={`font-mono text-[11px] font-bold ${theme === 'light' ? 'text-purple-700' : 'text-purple-400'}`}>MA200</span>
            </label>

            {isIntradayTimeframe ? (
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showVWAP}
                  onChange={e => setShowVWAP(e.target.checked)}
                  className="accent-orange-500"
                />
                <span className={`font-mono text-[11px] font-bold ${theme === 'light' ? 'text-orange-700' : 'text-orange-400'}`}>VWAP</span>
              </label>
            ) : (
              <span className={`text-[10px] italic cursor-help ${theme === 'light' ? 'text-slate-500 font-medium' : 'text-slate-600'}`} title="VWAP is relevant on intraday timeframes only (1m - 4h)">
                (VWAP Intraday Only)
              </span>
            )}

            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={showBollingerBands}
                onChange={e => setShowBollingerBands(e.target.checked)}
                className="accent-blue-500"
              />
              <span className={`font-mono text-[11px] font-bold ${theme === 'light' ? 'text-blue-700' : 'text-blue-300'}`}>Bollinger</span>
            </label>

            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={showRSI}
                onChange={e => setShowRSI(e.target.checked)}
                className="accent-blue-500"
              />
              <span className={`font-mono text-[11px] font-bold ${theme === 'light' ? 'text-blue-700' : 'text-blue-400'}`}>RSI</span>
            </label>

            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={showMACD}
                onChange={e => setShowMACD(e.target.checked)}
                className="accent-purple-500"
              />
              <span className={`font-mono text-[11px] font-bold ${theme === 'light' ? 'text-purple-700' : 'text-purple-400'}`}>MACD</span>
            </label>

            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={showVolume}
                onChange={e => setShowVolume(e.target.checked)}
                className="accent-emerald-500"
              />
              <span className={`font-mono text-[11px] font-bold ${theme === 'light' ? 'text-emerald-700' : 'text-emerald-400'}`}>Volume</span>
            </label>

            <button
              onClick={fetchChartData}
              disabled={isLoading}
              className={`p-1 rounded transition-colors ml-1 ${
                theme === 'light' ? 'bg-slate-100 border border-slate-300 hover:bg-slate-200 text-slate-700' : 'bg-dark-900 hover:bg-dark-800 text-slate-400 hover:text-white'
              }`}
              title="Reload Chart Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Error State Banner */}
        {errorMsg ? (
          <div className="p-8 my-6 text-center rounded border border-rose-900/60 bg-rose-950/30 text-rose-300 space-y-3 font-sans">
            <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
            <h3 className="text-sm font-bold uppercase font-mono">{errorMsg}</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              The live telemetry service encountered a temporary connection glitch or rate limit. Click retry to re-establish chart connection.
            </p>
            <button
              onClick={fetchChartData}
              className="px-4 py-1.5 bg-rose-900 hover:bg-rose-800 text-white rounded text-xs font-mono font-bold transition-colors"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          /* TradingView Lightweight Chart Viewport */
          <LightweightChart
            candles={candles}
            volume={volume}
            showMA20={showMA20}
            showMA50={showMA50}
            showMA200={showMA200}
            showRSI={showRSI}
            showMACD={showMACD}
            showVWAP={isIntradayTimeframe && showVWAP}
            showBollingerBands={showBollingerBands}
            showVolume={showVolume}
            rsiPeriod={14}
            timeframe={timeframe}
            currency={quote?.currency}
          />
        )}
      </div>
    </div>
  );
};
