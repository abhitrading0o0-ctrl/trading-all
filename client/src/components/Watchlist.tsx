import React, { useState } from 'react';
import { api } from '../services/api';
import type { WatchlistItem } from '../services/api';
import { Trash2, ArrowUpRight, ArrowDownRight, Activity, ExternalLink, RefreshCw, ChevronUp, ChevronDown } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { InstrumentSearch } from './InstrumentSearch';

interface WatchlistProps {
  watchlist: WatchlistItem[];
  isLoading: boolean;
  onSelectSymbol: (symbol: string, assetType: 'stock' | 'crypto' | 'forex') => void;
  onRefresh: () => void;
}

export const Watchlist: React.FC<WatchlistProps> = ({
  watchlist,
  isLoading,
  onSelectSymbol,
  onRefresh
}) => {
  const { theme } = useTheme();

  // Sorting state
  const [sortBy, setSortBy] = useState<'symbol' | 'change' | 'price' | 'asset'>('symbol');
  const [sortAsc, setSortAsc] = useState(true);

  const handleRemove = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await api.removeFromWatchlist(id);
      onRefresh();
    } catch (err) {
      console.error('Failed to remove from watchlist', err);
    }
  };

  const renderSparkline = (points: number[] | undefined, isPositive: boolean) => {
    if (!points || points.length < 2) return <div className="h-6 w-20 bg-dark-800/50 rounded animate-pulse" />;

    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const width = 80;
    const height = 24;

    const pathD = points.map((p, idx) => {
      const x = (idx / (points.length - 1)) * width;
      const y = height - ((p - min) / range) * (height - 4) - 2;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');

    const strokeColor = isPositive ? '#22c55e' : '#ef4444';

    return (
      <svg width={width} height={height} className="overflow-visible">
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  const handleSort = (field: 'symbol' | 'change' | 'price' | 'asset') => {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(true);
    }
  };

  const sortedWatchlist = [...watchlist].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'symbol') comparison = a.symbol.localeCompare(b.symbol);
    if (sortBy === 'asset') comparison = a.asset_type.localeCompare(b.asset_type);
    if (sortBy === 'change') comparison = (a.changePercent || 0) - (b.changePercent || 0);
    if (sortBy === 'price') comparison = (a.price || 0) - (b.price || 0);
    return sortAsc ? comparison : -comparison;
  });

  return (
    <div className="space-y-6 font-mono animate-tab-fade">
      {/* Header Banner */}
      <div className={`terminal-card p-4 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 border-l-4 ${
        theme === 'light' ? 'border-l-blue-600 bg-white shadow-xs' : 'border-l-blue-500 bg-[#05070a]'
      }`}>
        <div>
          <h1 className={`text-lg font-bold flex items-center gap-2 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
            <Activity className={`w-5 h-5 ${theme === 'light' ? 'text-blue-600' : 'text-blue-400'}`} />
            RESEARCH WATCHLIST
          </h1>
          <p className={`text-xs mt-1 ${theme === 'light' ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
            Real-time quotes across Indian Stocks, Crypto, and Forex pairs. Click any row to launch technical research.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full xl:w-auto">
          {/* Autocomplete Instrument Search */}
          <InstrumentSearch watchlist={watchlist} onRefresh={onRefresh} />

          <button
            onClick={onRefresh}
            className={`px-3 py-1.5 rounded text-xs border transition-colors flex items-center gap-1.5 ${
              theme === 'light'
                ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="terminal-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={`border-b text-[11px] select-none ${
                theme === 'light'
                  ? 'bg-slate-100 border-slate-300 text-slate-800 font-bold'
                  : 'bg-slate-900 border-slate-700 text-slate-200 font-bold'
              }`}>
                <th className="py-3 px-4 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => handleSort('symbol')}>
                  <div className="flex items-center gap-1">INSTRUMENT {sortBy === 'symbol' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                </th>
                <th className="py-3 px-4 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => handleSort('asset')}>
                  <div className="flex items-center gap-1">ASSET CLASS {sortBy === 'asset' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                </th>
                <th className="py-3 px-4 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => handleSort('price')}>
                  <div className="flex items-center gap-1">LIVE PRICE {sortBy === 'price' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                </th>
                <th className="py-3 px-4 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => handleSort('change')}>
                  <div className="flex items-center gap-1">24H CHANGE {sortBy === 'change' && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}</div>
                </th>
                <th className="py-3 px-4">24H HIGH / LOW</th>
                <th className="py-3 px-4">TREND (5D)</th>
                <th className="py-3 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${theme === 'light' ? 'divide-slate-200' : 'divide-dark-800/40'}`}>
              {isLoading && watchlist.length === 0 ? (
                <tr>
                  <td colSpan={7} className={`py-8 text-center animate-pulse ${theme === 'light' ? 'text-slate-600 font-semibold' : 'text-slate-400'}`}>
                    Fetching live quotes...
                  </td>
                </tr>
              ) : watchlist.length === 0 ? (
                <tr>
                  <td colSpan={7} className={`py-8 text-center italic ${theme === 'light' ? 'text-slate-600' : 'text-slate-500'}`}>
                    Your watchlist is empty. Search and add an instrument above.
                  </td>
                </tr>
              ) : (
                sortedWatchlist.map(item => {
                  const isPos = item.change >= 0;
                  const formattedPrice = item.currency === 'INR'
                    ? `₹${item.price?.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                    : `$${item.price?.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => onSelectSymbol(item.symbol, item.asset_type)}
                      className={`cursor-pointer transition-colors ${
                        theme === 'light'
                          ? 'hover:bg-slate-100/90 text-slate-900 border-b border-slate-200'
                          : 'hover:bg-slate-800/40 text-slate-100'
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-sm">{item.symbol}</div>
                        <div className={`text-[11px] font-sans ${theme === 'light' ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>{item.name || ''}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          item.asset_type === 'stock'
                            ? (theme === 'light' ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-amber-950 text-amber-400 border border-amber-800')
                            : item.asset_type === 'crypto'
                              ? (theme === 'light' ? 'bg-purple-100 text-purple-800 border border-purple-300' : 'bg-purple-950 text-purple-400 border border-purple-800')
                              : (theme === 'light' ? 'bg-cyan-100 text-cyan-800 border border-cyan-300' : 'bg-cyan-950 text-cyan-400 border border-cyan-800')
                        }`}>
                          {item.asset_type}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-sm">
                        {formattedPrice}
                      </td>

                      <td className="py-3.5 px-4 font-bold">
                        <div className={`flex items-center gap-1 ${
                          isPos
                            ? (theme === 'light' ? 'text-emerald-700' : 'text-emerald-400')
                            : (theme === 'light' ? 'text-rose-700' : 'text-rose-400')
                        }`}>
                          {isPos ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                          <span>{isPos ? '+' : ''}{item.change?.toFixed(2)} ({isPos ? '+' : ''}{item.changePercent?.toFixed(2)}%)</span>
                        </div>
                      </td>

                      <td className={`py-3.5 px-4 text-[11px] ${theme === 'light' ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
                        <div>H: {item.currency === 'INR' ? '₹' : '$'}{item.dayHigh}</div>
                        <div>L: {item.currency === 'INR' ? '₹' : '$'}{item.dayLow}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        {renderSparkline(item.sparkline, isPos)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectSymbol(item.symbol, item.asset_type);
                            }}
                            className={`p-1.5 rounded transition-colors ${
                              theme === 'light' ? 'hover:bg-slate-200 text-slate-600 hover:text-blue-600' : 'hover:bg-dark-700 text-slate-400 hover:text-white'
                            }`}
                            title="Open Technical Research"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>

                          <button
                            onClick={(e) => handleRemove(e, item.id)}
                            className={`p-1.5 rounded transition-colors ${
                              theme === 'light' ? 'hover:bg-rose-100 text-slate-500 hover:text-rose-700' : 'hover:bg-rose-950/80 text-slate-400 hover:text-rose-400'
                            }`}
                            title="Remove from Watchlist"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
