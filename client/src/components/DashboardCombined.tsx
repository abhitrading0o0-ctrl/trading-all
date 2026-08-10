import React from 'react';
import type { WatchlistItem } from '../services/api';
import { Watchlist } from './Watchlist';
import { ResearchPage } from './ResearchPage';
import { TradeJournal } from './TradeJournal';
import type { CalcPrefill } from './RiskCalculator';
import { Maximize2, ExternalLink } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface DashboardCombinedProps {
  watchlist: WatchlistItem[];
  isWatchlistLoading: boolean;
  selectedSymbol: string;
  selectedAssetType: 'stock' | 'crypto' | 'forex';
  onSelectSymbol: (symbol: string, assetType: 'stock' | 'crypto' | 'forex') => void;
  onRefreshWatchlist: () => void;
  onLogTrade: (symbol: string, entryPrice: number, votingMode?: string, voteTally?: string, voteStrength?: number, calcPrefill?: CalcPrefill) => void;
  onNavigateToTab: (tab: 'dashboard' | 'watchlist' | 'research' | 'chart' | 'journal' | 'calculator') => void;
}

export const DashboardCombined: React.FC<DashboardCombinedProps> = ({
  watchlist,
  isWatchlistLoading,
  selectedSymbol,
  selectedAssetType,
  onSelectSymbol,
  onRefreshWatchlist,
  onLogTrade,
  onNavigateToTab
}) => {
  const { theme } = useTheme();

  return (
    <div className="space-y-6 font-mono animate-tab-fade">
      {/* Combined View Header Banner */}
      <div className={`terminal-card p-4 flex items-center justify-between border-l-4 ${theme === 'light' ? 'border-l-blue-600 bg-white shadow-xs' : 'border-l-blue-500 bg-[#05070a]'
        }`}>
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="ForFuture Trade Logo" className="h-10 w-auto object-contain rounded-lg bg-white p-1 shadow-sm border border-blue-400/40 shrink-0" />
          <div>
            <h1 className={`text-lg font-bold flex items-center gap-2 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
              BLOOMBERG TERMINAL COMBINED DASHBOARD
            </h1>
            <p className={`text-xs mt-1 font-sans ${theme === 'light' ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
              Unified multi-panel telemetry view composing Watchlist, Research, Strategy Voting, and Journal. Click panel titles to jump to full-screen standalone views.
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs">
          <span className={`text-[10px] uppercase font-bold ${theme === 'light' ? 'text-slate-600' : 'text-slate-500'}`}>QUICK FOCUS:</span>
          <button
            onClick={() => onNavigateToTab('watchlist')}
            className={`px-2 py-1 rounded border transition-colors flex items-center gap-1 font-semibold ${theme === 'light' ? 'bg-slate-100 border-slate-300 hover:border-blue-600 text-slate-800' : 'bg-dark-900 border-dark-800 hover:border-cyan-400 text-slate-300'
              }`}
          >
            Watchlist <Maximize2 className={`w-3 h-3 ${theme === 'light' ? 'text-blue-600' : 'text-cyan-400'}`} />
          </button>
          <button
            onClick={() => onNavigateToTab('research')}
            className={`px-2 py-1 rounded border transition-colors flex items-center gap-1 font-semibold ${theme === 'light' ? 'bg-slate-100 border-slate-300 hover:border-blue-600 text-slate-800' : 'bg-dark-900 border-dark-800 hover:border-cyan-400 text-slate-300'
              }`}
          >
            Research <Maximize2 className={`w-3 h-3 ${theme === 'light' ? 'text-blue-600' : 'text-cyan-400'}`} />
          </button>
          <button
            onClick={() => onNavigateToTab('chart')}
            className={`px-2 py-1 rounded border transition-colors flex items-center gap-1 font-semibold ${theme === 'light' ? 'bg-slate-100 border-slate-300 hover:border-blue-600 text-slate-800' : 'bg-dark-900 border-dark-800 hover:border-cyan-400 text-slate-300'
              }`}
          >
            Pro Chart <Maximize2 className={`w-3 h-3 ${theme === 'light' ? 'text-blue-600' : 'text-cyan-400'}`} />
          </button>
          <button
            onClick={() => onNavigateToTab('journal')}
            className={`px-2 py-1 rounded border transition-colors flex items-center gap-1 font-semibold ${theme === 'light' ? 'bg-slate-100 border-slate-300 hover:border-blue-600 text-slate-800' : 'bg-dark-900 border-dark-800 hover:border-cyan-400 text-slate-300'
              }`}
          >
            Journal <Maximize2 className={`w-3 h-3 ${theme === 'light' ? 'text-blue-600' : 'text-cyan-400'}`} />
          </button>
        </div>
      </div>

      {/* TOP SECTION: Watchlist Panel */}
      <div className="relative group">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => onNavigateToTab('watchlist')}
            className={`text-xs font-bold uppercase flex items-center gap-1 hover:underline ${theme === 'light' ? 'text-blue-700' : 'text-cyan-400'}`}
          >
            <span>WATCHLIST MODULE</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
        <Watchlist
          watchlist={watchlist}
          isLoading={isWatchlistLoading}
          onSelectSymbol={onSelectSymbol}
          onRefresh={onRefreshWatchlist}
        />
      </div>

      {/* MIDDLE SECTION: Research & Voting Panel */}
      <div className={`relative group pt-4 border-t ${theme === 'light' ? 'border-slate-300' : 'border-dark-800'}`}>
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => onNavigateToTab('research')}
            className={`text-xs font-bold uppercase flex items-center gap-1 hover:underline ${theme === 'light' ? 'text-blue-700' : 'text-cyan-400'}`}
          >
            <span>RESEARCH & STRATEGY VOTING MODULE ({selectedSymbol})</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
        <ResearchPage
          symbol={selectedSymbol}
          assetType={selectedAssetType}
          onLogTrade={onLogTrade}
          onRefreshWatchlist={onRefreshWatchlist}
        />
      </div>

      {/* BOTTOM SECTION: Journal Module */}
      <div className={`relative group pt-4 border-t ${theme === 'light' ? 'border-slate-300' : 'border-dark-800'}`}>
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => onNavigateToTab('journal')}
            className={`text-xs font-bold uppercase flex items-center gap-1 hover:underline ${theme === 'light' ? 'text-blue-700' : 'text-cyan-400'}`}
          >
            <span>TRADE JOURNAL & REFLECTION LAB</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
        <TradeJournal
          initialInstrument=""
          initialPrice={0}
        />
      </div>
    </div>
  );
};
