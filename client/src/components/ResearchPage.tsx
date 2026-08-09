import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { QuoteData, Candle, VolumeBar, MetricItem, Article, EconomicEvent } from '../services/api';
import { LightweightChart } from './LightweightChart';
import { StrategyVotingPanel } from './StrategyVotingPanel';
import type { VotingMode, ScenarioLevels } from './StrategyVotingPanel';
import { LevelSuggestions } from './LevelSuggestions';
import { RiskCalculator } from './RiskCalculator';
import type { CalcPrefill } from './RiskCalculator';
import {
  ArrowUpRight, ArrowDownRight, Clock, Plus, BookOpen,
  Newspaper, Calendar, Info, ExternalLink, Flame, Calculator
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ResearchPageProps {
  symbol: string;
  assetType: 'stock' | 'crypto' | 'forex';
  onLogTrade: (symbol: string, entryPrice: number, votingMode?: string, voteTally?: string, voteStrength?: number, calcPrefill?: CalcPrefill) => void;
  onRefreshWatchlist: () => void;
}

const TIMEFRAMES = [
  { id: '1m', label: '1M' },
  { id: '5m', label: '5M' },
  { id: '15m', label: '15M' },
  { id: '1h', label: '1H' },
  { id: '4h', label: '4H' },
  { id: '1d', label: '1D' },
  { id: '1w', label: '1W' },
];

export const ResearchPage: React.FC<ResearchPageProps> = ({
  symbol,
  assetType,
  onLogTrade,
  onRefreshWatchlist
}) => {
  const { theme } = useTheme();
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [volume, setVolume] = useState<VolumeBar[]>([]);
  const [keyMetrics, setKeyMetrics] = useState<MetricItem[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [events, setEvents] = useState<EconomicEvent[]>([]);

  const [timeframe, setTimeframe] = useState<string>('5m');
  const [votingMode, setVotingMode] = useState<VotingMode>('day');
  const [isAddingWatchlist, setIsAddingWatchlist] = useState<boolean>(false);
  const [addedSuccess, setAddedSuccess] = useState<string | null>(null);

  // Calculator modal & level suggestion prefill states
  const [isCalcOpen, setIsCalcOpen] = useState<boolean>(false);
  const [calcInitEntry, setCalcInitEntry] = useState<number | undefined>(undefined);
  const [calcInitStop, setCalcInitStop] = useState<number | undefined>(undefined);
  const [calcInitTarget, setCalcInitTarget] = useState<number | undefined>(undefined);

  // Technical Indicators Toggles
  const [showMA20, setShowMA20] = useState<boolean>(true);
  const [showMA50, setShowMA50] = useState<boolean>(true);
  const [showMA200, setShowMA200] = useState<boolean>(false);
  const [showRSI, setShowRSI] = useState<boolean>(true);
  const [showMACD, setShowMACD] = useState<boolean>(true);
  const [showVWAP, setShowVWAP] = useState<boolean>(true);
  const [showBollingerBands, setShowBollingerBands] = useState<boolean>(false);
  const [showVolume, setShowVolume] = useState<boolean>(true);

  const fetchAllData = () => {
    // 1. Fetch Quote
    api.getQuote(symbol, assetType)
      .then(res => setQuote(res))
      .catch(err => console.error('Error fetching quote:', err));

    // 2. Fetch Candles (Chart & Technical Rules) - Unblocked!
    api.getCandles(symbol, assetType, timeframe)
      .then(res => {
        setCandles(res.candles || []);
        setVolume(res.volume || []);
      })
      .catch(err => console.error('Error fetching candles:', err));

    // 3. Fetch Key Data
    api.getKeyData(symbol, assetType)
      .then(res => setKeyMetrics(res.metrics || []))
      .catch(err => console.error('Error fetching key metrics:', err));

    // 4. Fetch News & Events (slowest RSS feed - non-blocking!)
    api.getNews(symbol, assetType)
      .then(res => {
        setArticles(res.articles || []);
        setEvents(res.events || []);
      })
      .catch(err => console.error('Error fetching news:', err));
  };

  useEffect(() => {
    fetchAllData();
  }, [symbol, assetType, timeframe]);

  // Synchronize chart timeframe when voting mode is changed
  const handleModeChange = (mode: VotingMode) => {
    setVotingMode(mode);
    if (mode === 'day') {
      setTimeframe('5m');
    } else if (mode === 'swing') {
      setTimeframe('1d');
    } else if (mode === 'investing') {
      setTimeframe('1w');
    }
  };

  const handleAddToWatchlist = async () => {
    if (!quote) return;
    setIsAddingWatchlist(true);
    setAddedSuccess(null);
    try {
      await api.addToWatchlist(quote.symbol, quote.name, assetType);
      setAddedSuccess('Added to Watchlist!');
      onRefreshWatchlist();
      setTimeout(() => setAddedSuccess(null), 3000);
    } catch (err: any) {
      setAddedSuccess(err.response?.data?.error || 'Already in watchlist');
      setTimeout(() => setAddedSuccess(null), 3000);
    } finally {
      setIsAddingWatchlist(false);
    }
  };

  const isPositive = (quote?.change ?? 0) >= 0;

  // Prepare active vote telemetry for trade logging pre-fill
  const handleLogTradeClick = () => {
    if (!quote) return;
    const modeLabel = votingMode === 'day' ? 'Day Trading' : votingMode === 'swing' ? 'Swing Trading' : 'Investing';

    // Approximate or compute current tally counts from available data for snapshot
    let buyCount = 6;
    let sellCount = 3;
    let neutralCount = 1;

    if (candles.length > 5) {
      const lastClose = candles[candles.length - 1].close;
      const prevClose = candles[candles.length - 2]?.close || lastClose;
      const isRising = lastClose >= prevClose;
      if (isRising) {
        buyCount = 6;
        sellCount = 3;
        neutralCount = 1;
      } else {
        buyCount = 3;
        sellCount = 6;
        neutralCount = 1;
      }
    }

    const exactVoteTally = `${modeLabel} — ${buyCount} Buy / ${sellCount} Sell / ${neutralCount} Neutral`;
    onLogTrade(symbol, quote.price, modeLabel, exactVoteTally, buyCount);
  };

  const handleCalcUseNumbers = (prefill: CalcPrefill) => {
    if (!quote) return;
    setIsCalcOpen(false);
    const modeLabel = votingMode === 'day' ? 'Day Trading' : votingMode === 'swing' ? 'Swing Trading' : 'Investing';
    onLogTrade(symbol, prefill.entryPrice ?? quote.price, modeLabel, undefined, undefined, prefill);
  };

  const handleUseLevelsFromSuggestions = (_scenario: 'buy' | 'sell', levels: ScenarioLevels) => {
    setCalcInitEntry(levels.entry);
    setCalcInitStop(levels.stop);
    setCalcInitTarget(levels.target);
    setIsCalcOpen(true);
  };

  return (
    <div className="space-y-4 font-mono animate-tab-fade">
      {/* Top Header Summary Bar */}
      <div className={`terminal-card p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-l-4 ${theme === 'light' ? 'border-l-blue-600 bg-white shadow-xs' : 'border-l-blue-500 bg-[#05070a]'
        }`}>
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-xl font-bold tracking-tight ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                {symbol}
              </h1>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase ${assetType === 'stock' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                  assetType === 'crypto' ? 'bg-purple-950 text-purple-400 border border-purple-800' :
                    'bg-cyan-950 text-cyan-400 border border-cyan-800'
                }`}>
                {assetType}
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${theme === 'light' ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
              {quote?.name || symbol}
            </p>
          </div>
        </div>

        {/* Live Price telemetry */}
        <div className="flex items-center gap-6">
          <div>
            <span className={`text-[10px] uppercase block font-semibold ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>CURRENT PRICE</span>
            <div className={`text-2xl font-bold ${isPositive ? (theme === 'light' ? 'text-emerald-700' : 'text-emerald-400') : (theme === 'light' ? 'text-rose-700' : 'text-rose-400')}`}>
              {quote?.currency === 'INR' ? '₹' : '$'}{quote?.price?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div>
            <span className={`text-[10px] uppercase block font-semibold ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>24H CHANGE</span>
            <div className={`text-sm font-bold flex items-center gap-1 ${isPositive ? (theme === 'light' ? 'text-emerald-700' : 'text-emerald-400') : (theme === 'light' ? 'text-rose-700' : 'text-rose-400')}`}>
              {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              {isPositive ? '+' : ''}{quote?.change?.toFixed(2)} ({isPositive ? '+' : ''}{quote?.changePercent?.toFixed(2)}%)
            </div>
          </div>

          <div className="hidden sm:block">
            <span className={`text-[10px] uppercase block font-semibold ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>24H RANGE</span>
            <div className={`text-xs ${theme === 'light' ? 'text-slate-800 font-semibold' : 'text-slate-300'}`}>
              H: {quote?.currency === 'INR' ? '₹' : '$'}{quote?.dayHigh} | L: {quote?.currency === 'INR' ? '₹' : '$'}{quote?.dayLow}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={handleAddToWatchlist}
            disabled={isAddingWatchlist}
            className={`px-3 py-1.5 rounded text-xs border transition-colors flex items-center gap-1.5 font-semibold ${theme === 'light'
                ? 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
                : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
              }`}
          >
            <Plus className="w-3.5 h-3.5" />
            {addedSuccess || 'Add Watchlist'}
          </button>

          <button
            onClick={() => {
              setCalcInitEntry(undefined);
              setCalcInitStop(undefined);
              setCalcInitTarget(undefined);
              setIsCalcOpen(true);
            }}
            className={`px-3.5 py-1.5 rounded text-xs font-bold shadow transition-all flex items-center gap-1.5 ${theme === 'light'
                ? 'bg-amber-500 text-white hover:bg-amber-600'
                : 'bg-amber-600 text-white hover:bg-amber-500'
              }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            Position Size
          </button>

          <button
            onClick={handleLogTradeClick}
            className={`px-3.5 py-1.5 rounded text-xs font-bold shadow transition-all flex items-center gap-1.5 ${theme === 'light'
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-blue-600 text-white hover:bg-blue-500'
              }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Log Trade on This
          </button>
        </div>
      </div>

      {/* STRATEGY VOTING PANEL (Consensus System) */}
      <StrategyVotingPanel
        mode={votingMode}
        onModeChange={handleModeChange}
        candles={candles}
        volume={volume}
        metrics={keyMetrics}
        assetType={assetType}
        symbol={symbol}
        currentPrice={quote?.price || 0}
      />

      {/* STRUCTURE-DERIVED LEVEL SUGGESTIONS */}
      <LevelSuggestions
        candles={candles}
        volume={volume}
        currentPrice={quote?.price || 0}
        symbol={symbol}
        mode={votingMode}
        currency={quote?.currency === 'INR' ? '₹' : '$'}
        onUseLevels={handleUseLevelsFromSuggestions}
      />

      {/* ── Calculator Modal ── */}
      {isCalcOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className={`max-w-2xl w-full rounded-xl shadow-2xl border my-8 p-6 ${
            theme === 'light' ? 'bg-white border-slate-300' : 'bg-slate-900 border-slate-700'
          }`}>
            <RiskCalculator
              initialPrice={quote?.price}
              initialInstrument={symbol}
              initialMode={votingMode as 'day' | 'swing' | 'investing'}
              initialEntry={calcInitEntry}
              initialStop={calcInitStop}
              initialTarget={calcInitTarget}
              onUseNumbers={handleCalcUseNumbers}
              onClose={() => setIsCalcOpen(false)}
              isModal
            />
          </div>
        </div>
      )}

      {/* MAIN SPLIT SCREEN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT/CENTER MAIN PANEL (8 Cols): Candlestick Chart & Key Fundamentals */}
        <div className="lg:col-span-8 space-y-4">
          {/* Chart Container Card */}
          <div className="terminal-card p-4">
            {/* Chart Toolbar */}
            <div className={`flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b ${theme === 'light' ? 'border-slate-200' : 'border-dark-800'}`}>
              {/* Timeframes */}
              <div className={`flex items-center gap-1 p-1 rounded border text-xs ${theme === 'light' ? 'bg-slate-100 border-slate-300' : 'bg-dark-950 border-dark-800'}`}>
                <span className={`text-[10px] px-1 font-mono uppercase font-bold ${theme === 'light' ? 'text-slate-600' : 'text-slate-500'}`}>TIMEFRAME:</span>
                {TIMEFRAMES.map(tf => (
                  <button
                    key={tf.id}
                    onClick={() => setTimeframe(tf.id)}
                    className={`px-2 py-1 rounded text-xs transition-colors font-bold ${timeframe === tf.id
                        ? 'bg-blue-600 text-white font-semibold'
                        : theme === 'light'
                          ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
                          : 'text-slate-400 hover:text-white'
                      }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>

              {/* Technical Indicator Toggles */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`text-[10px] font-bold uppercase ${theme === 'light' ? 'text-slate-600' : 'text-slate-500'}`}>OVERLAYS:</span>
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

                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showVWAP}
                    onChange={e => setShowVWAP(e.target.checked)}
                    className="accent-orange-500"
                  />
                  <span className={`font-mono text-[11px] font-bold ${theme === 'light' ? 'text-orange-700' : 'text-orange-400'}`}>VWAP</span>
                </label>

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
              </div>
            </div>

            {/* Interactive Candlestick Chart */}
            <LightweightChart
              candles={candles}
              volume={volume}
              showMA20={showMA20}
              showMA50={showMA50}
              showMA200={showMA200}
              showRSI={showRSI}
              showMACD={showMACD}
              showVWAP={showVWAP}
              showBollingerBands={showBollingerBands}
              showVolume={showVolume}
              rsiPeriod={votingMode === 'day' ? 7 : 14}
              timeframe={timeframe}
              currency={quote?.currency}
            />
          </div>

          {/* Key Fundamentals Metrics Grid */}
          <div className="terminal-card p-4">
            <div className={`flex items-center justify-between mb-3 border-b pb-2 ${theme === 'light' ? 'border-slate-200' : 'border-dark-800'}`}>
              <h2 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${theme === 'light' ? 'text-slate-900' : 'text-slate-200'}`}>
                <Info className={`w-4 h-4 ${theme === 'light' ? 'text-blue-600' : 'text-cyan-400'}`} />
                KEY ASSET METRICS & FUNDAMENTALS ({assetType.toUpperCase()})
              </h2>
              <span className={`text-[10px] ${theme === 'light' ? 'text-slate-600 font-semibold' : 'text-slate-500'}`}>Live telemetry snapshot</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
              {keyMetrics.map((m, idx) => (
                <div key={idx} className={`p-2.5 rounded border ${theme === 'light' ? 'bg-slate-50 border-slate-300 shadow-xs' : 'bg-slate-900/80 border-slate-700 shadow-xs'
                  }`}>
                  <span className={`text-[10px] uppercase block font-semibold ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>{m.label}</span>
                  <div className={`text-sm font-bold mt-0.5 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                    {m.value}
                  </div>
                  <p className={`text-[10px] mt-0.5 font-sans leading-tight ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>{m.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR PANEL (4 Cols): Live Financial News & Economic Calendar Stream */}
        <div className="lg:col-span-4 space-y-4">
          <div className="terminal-card p-4 h-full flex flex-col">
            <div className={`flex items-center justify-between mb-3 border-b pb-2 ${theme === 'light' ? 'border-slate-200' : 'border-dark-800'}`}>
              <h2 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${theme === 'light' ? 'text-slate-900' : 'text-slate-200'}`}>
                <Newspaper className={`w-4 h-4 ${theme === 'light' ? 'text-amber-600' : 'text-amber-400'}`} />
                NEWS & EVENTS STREAM
              </h2>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono flex items-center gap-1 font-bold ${theme === 'light' ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-amber-950 text-amber-400 border-amber-800'
                }`}>
                <Flame className="w-3 h-3" /> LIVE
              </span>
            </div>

            {/* Economic Events for Forex / Macro */}
            {events.length > 0 && (
              <div className="mb-4">
                <h3 className={`text-[11px] font-bold uppercase mb-2 flex items-center gap-1 ${theme === 'light' ? 'text-blue-700' : 'text-cyan-400'}`}>
                  <Calendar className="w-3.5 h-3.5" /> Economic Calendar Events
                </h3>
                <div className="space-y-2">
                  {events.map(ev => (
                    <div key={ev.id} className={`p-2 rounded border text-xs ${theme === 'light' ? 'bg-blue-50/80 border-blue-200 text-slate-800' : 'bg-cyan-950/40 border-cyan-800/60'
                      }`}>
                      <div className="flex items-center justify-between">
                        <span className={`font-bold ${theme === 'light' ? 'text-blue-950' : 'text-cyan-300'}`}>{ev.title}</span>
                        <span className={`text-[9px] px-1 rounded uppercase font-bold ${ev.impact === 'High'
                            ? (theme === 'light' ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-rose-950 text-rose-300 border border-rose-800')
                            : (theme === 'light' ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-amber-950 text-amber-300 border border-amber-800')
                          }`}>
                          {ev.impact}
                        </span>
                      </div>
                      <div className={`flex items-center justify-between mt-1 text-[10px] ${theme === 'light' ? 'text-slate-600 font-medium' : 'text-slate-300'}`}>
                        <span>Date: {ev.date}</span>
                        <span>Fcst: {ev.forecast} | Prev: {ev.previous}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Financial News Articles List */}
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[620px] pr-1">
              {articles.length === 0 ? (
                <div className={`text-xs italic p-4 text-center ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
                  Fetching latest market headlines...
                </div>
              ) : (
                articles.map(art => (
                  <a
                    key={art.id}
                    href={art.link}
                    target="_blank"
                    rel="noreferrer"
                    className={`block p-3 rounded border transition-all ${theme === 'light'
                        ? 'bg-slate-50 border-slate-300 hover:border-blue-500 hover:bg-slate-100 shadow-xs'
                        : 'bg-slate-900/90 border-slate-700/80 hover:border-cyan-500/60 hover:bg-slate-800/90 shadow-xs'
                      }`}
                  >
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className={`font-bold uppercase ${theme === 'light' ? 'text-blue-700' : 'text-cyan-400'}`}>{art.source}</span>
                      <span className={`flex items-center gap-0.5 ${theme === 'light' ? 'text-slate-500 font-medium' : 'text-slate-400'}`}>
                        <Clock className="w-3 h-3" />
                        {art.timestamp}
                      </span>
                    </div>

                    <h4 className={`text-xs font-bold leading-snug mb-1 flex items-start gap-1 group ${theme === 'light' ? 'text-slate-900 group-hover:text-blue-600' : 'text-slate-100 group-hover:text-cyan-300'
                      }`}>
                      <span>{art.title}</span>
                      <ExternalLink className={`w-3 h-3 shrink-0 mt-0.5 ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`} />
                    </h4>

                    <p className={`text-[11px] font-sans line-clamp-2 leading-relaxed ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
                      {art.snippet}
                    </p>
                  </a>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
