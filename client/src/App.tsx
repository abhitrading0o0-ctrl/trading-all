import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import type { ActiveTab } from './components/Navbar';
import { DashboardCombined } from './components/DashboardCombined';
import { Watchlist } from './components/Watchlist';
import { ResearchPage } from './components/ResearchPage';
import { MultiTimeframeChartPage } from './components/MultiTimeframeChartPage';
import { TradeJournal } from './components/TradeJournal';
import { RiskCalculator } from './components/RiskCalculator';
import type { CalcPrefill } from './components/RiskCalculator';
import { PageTransitionOverlay } from './components/PageTransitionOverlay';
import { api } from './services/api';
import type { WatchlistItem } from './services/api';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { TrendingUp, TrendingDown, ArrowLeft } from 'lucide-react';

function TickerTape({ items, onSelectSymbol }: { items: WatchlistItem[]; onSelectSymbol: (symbol: string, assetType: 'stock' | 'crypto' | 'forex') => void }) {
  const { theme } = useTheme();
  if (!items || items.length === 0) return null;

  // Duplicate list to create a seamless infinite scroll loop
  const tickerItems = [...items, ...items, ...items];

  return (
    <div className={`w-full overflow-hidden border-b text-xs font-mono py-1.5 transition-colors ${theme === 'light'
        ? 'bg-slate-200/70 border-slate-300 text-slate-800'
        : 'bg-[#050505] border-slate-800/80 text-slate-300'
      }`}>
      <div className="animate-ticker-marquee gap-8 whitespace-nowrap">
        {tickerItems.map((item, idx) => {
          const isPos = item.change >= 0;
          return (
            <div
              key={`${item.symbol}-${idx}`}
              onClick={() => onSelectSymbol(item.symbol, item.asset_type)}
              className="inline-flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <span className="font-bold">{item.symbol}</span>
              <span className="text-[11px] font-sans text-slate-400">
                {item.currency === 'INR' ? '₹' : '$'}{item.price?.toFixed(2)}
              </span>
              <span className={`inline-flex items-center font-bold text-[11px] ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isPos ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                {isPos ? '+' : ''}{item.changePercent?.toFixed(2)}%
              </span>
              <span className="text-slate-700 font-bold ml-4">•</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MainLayout() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [isWatchlistLoading, setIsWatchlistLoading] = useState<boolean>(true);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('RELIANCE.NS');
  const [selectedAssetType, setSelectedAssetType] = useState<'stock' | 'crypto' | 'forex'>('stock');

  // Trade pre-fill state for jumping to Journal
  const [tradePreFillSymbol, setTradePreFillSymbol] = useState<string>('');
  const [tradePreFillPrice, setTradePreFillPrice] = useState<number>(0);
  const [tradePreFillVotingMode, setTradePreFillVotingMode] = useState<string>('');
  const [tradePreFillVoteTally, setTradePreFillVoteTally] = useState<string>('');
  const [tradePreFillVoteStrength, setTradePreFillVoteStrength] = useState<number>(0);
  const [tradePreFillStopLoss, setTradePreFillStopLoss] = useState<number>(0);
  const [tradePreFillTarget, setTradePreFillTarget] = useState<number>(0);
  const [tradePreFillPositionSize, setTradePreFillPositionSize] = useState<number>(0);

  // 3D Page Transition Overlay State
  const [isTransitionActive, setIsTransitionActive] = useState<boolean>(false);
  const [pendingTab, setPendingTab] = useState<ActiveTab>('dashboard');

  const triggerPageTransition = (targetTab?: ActiveTab) => {
    const nextTab = targetTab || activeTab;
    setPendingTab(nextTab);
    setIsTransitionActive(true);
  };

  const handleTransitionPeak = () => {
    setActiveTab(pendingTab);
  };

  const handleTransitionComplete = () => {
    setIsTransitionActive(false);
  };

  const fetchWatchlist = async () => {
    setIsWatchlistLoading(true);
    try {
      const data = await api.getWatchlist();
      setWatchlist(data);
    } catch (e) {
      console.error('Failed to fetch watchlist', e);
    } finally {
      setIsWatchlistLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const handleSelectSymbol = (symbol: string, assetType: 'stock' | 'crypto' | 'forex') => {
    setSelectedSymbol(symbol);
    setSelectedAssetType(assetType);
    triggerPageTransition('research');
  };

  const handleLogTradeFromResearch = (symbol: string, entryPrice: number, votingMode?: string, voteTally?: string, voteStrength?: number, calcPrefill?: CalcPrefill) => {
    setTradePreFillSymbol(calcPrefill?.instrument ?? symbol);
    setTradePreFillPrice(calcPrefill?.entryPrice ?? entryPrice);
    setTradePreFillVotingMode(calcPrefill?.votingMode ?? votingMode ?? '');
    setTradePreFillVoteTally(voteTally ?? '');
    setTradePreFillVoteStrength(voteStrength ?? 0);
    setTradePreFillStopLoss(calcPrefill?.stopLoss ?? 0);
    setTradePreFillTarget(calcPrefill?.target ?? 0);
    setTradePreFillPositionSize(calcPrefill?.positionSize ?? 0);
    triggerPageTransition('journal');
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${theme === 'light'
        ? 'bg-[#f3f5f8] text-slate-900'
        : 'bg-[#000000] text-slate-100'
      }`}>
      {/* VFX Page Transition Overlay */}
      <PageTransitionOverlay
        isActive={isTransitionActive}
        targetPage={pendingTab}
        onTransitionPeak={handleTransitionPeak}
        onComplete={handleTransitionComplete}
      />

      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedSymbol={selectedSymbol}
        onRefresh={fetchWatchlist}
        onTriggerTransition={triggerPageTransition}
      />

      <TickerTape items={watchlist} onSelectSymbol={handleSelectSymbol} />

      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Back to Combined Dashboard Navigation Bar for Standalone Views */}
        {activeTab !== 'dashboard' && (
          <div className="mb-4 flex items-center justify-between font-mono">
            <button
              onClick={() => triggerPageTransition('dashboard')}
              className={`px-3 py-1.5 rounded text-xs border transition-all flex items-center gap-1.5 font-bold ${theme === 'light'
                  ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                  : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                }`}
            >
              <ArrowLeft className="w-4 h-4 text-blue-500" />
              Back to Combined Terminal Dashboard
            </button>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              Viewing Standalone Full-Screen View: <strong className="uppercase text-blue-500">{activeTab}</strong>
            </span>
          </div>
        )}

        <div key={activeTab} className="animate-tab-fade">
          {activeTab === 'dashboard' && (
            <DashboardCombined
              watchlist={watchlist}
              isWatchlistLoading={isWatchlistLoading}
              selectedSymbol={selectedSymbol}
              selectedAssetType={selectedAssetType}
              onSelectSymbol={handleSelectSymbol}
              onRefreshWatchlist={fetchWatchlist}
              onLogTrade={handleLogTradeFromResearch}
              onNavigateToTab={triggerPageTransition}
            />
          )}

          {activeTab === 'watchlist' && (
            <Watchlist
              watchlist={watchlist}
              isLoading={isWatchlistLoading}
              onSelectSymbol={handleSelectSymbol}
              onRefresh={fetchWatchlist}
            />
          )}

          {activeTab === 'research' && (
            <ResearchPage
              symbol={selectedSymbol}
              assetType={selectedAssetType}
              onLogTrade={handleLogTradeFromResearch}
              onRefreshWatchlist={fetchWatchlist}
            />
          )}

          {activeTab === 'chart' && (
            <MultiTimeframeChartPage
              symbol={selectedSymbol}
              assetType={selectedAssetType}
              onSelectSymbol={(sym, asset) => {
                setSelectedSymbol(sym);
                setSelectedAssetType(asset);
              }}
              onNavigateToResearch={(sym, asset) => {
                setSelectedSymbol(sym);
                setSelectedAssetType(asset);
                triggerPageTransition('research');
              }}
              onNavigateToVoting={(sym, asset) => {
                setSelectedSymbol(sym);
                setSelectedAssetType(asset);
                triggerPageTransition('research');
              }}
            />
          )}

          {activeTab === 'journal' && (
            <TradeJournal
              initialInstrument={tradePreFillSymbol}
              initialPrice={tradePreFillPrice}
              initialVotingMode={tradePreFillVotingMode}
              initialVoteTally={tradePreFillVoteTally}
              initialVoteStrength={tradePreFillVoteStrength}
              initialStopLoss={tradePreFillStopLoss}
              initialTarget={tradePreFillTarget}
              initialPositionSize={tradePreFillPositionSize}
              onTradeLogged={() => {
                setTradePreFillSymbol('');
                setTradePreFillPrice(0);
                setTradePreFillVotingMode('');
                setTradePreFillVoteTally('');
                setTradePreFillVoteStrength(0);
                setTradePreFillStopLoss(0);
                setTradePreFillTarget(0);
                setTradePreFillPositionSize(0);
              }}
            />
          )}

          {activeTab === 'calculator' && (
            <div className="max-w-2xl mx-auto">
              <RiskCalculator
                onUseNumbers={(prefill) => {
                  handleLogTradeFromResearch(
                    prefill.instrument ?? '',
                    prefill.entryPrice ?? 0,
                    prefill.votingMode,
                    undefined,
                    undefined,
                    prefill
                  );
                }}
              />
            </div>
          )}
        </div>
      </main>

      <footer className={`py-3 text-center text-xs font-mono border-t transition-colors ${theme === 'light'
          ? 'bg-white border-slate-200 text-slate-500'
          : 'bg-[#050505] border-slate-800/80 text-slate-500'
        }`}>
        ForFutureTrade • Personal Trading Research & Journal • Localhost Only
      </footer>
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <MainLayout />
    </ThemeProvider>
  );
}

export default App;
