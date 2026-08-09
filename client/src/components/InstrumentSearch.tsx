import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';
import type { SearchResult, WatchlistItem } from '../services/api';
import { Search, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface InstrumentSearchProps {
  watchlist: WatchlistItem[];
  onRefresh: () => void;
}

const BADGE_LIGHT: Record<string, string> = {
  stock: 'bg-amber-100 text-amber-800 border border-amber-300',
  crypto: 'bg-purple-100 text-purple-800 border border-purple-300',
  forex: 'bg-cyan-100 text-cyan-800 border border-cyan-300',
};
const BADGE_DARK: Record<string, string> = {
  stock: 'bg-amber-950 text-amber-400 border border-amber-800',
  crypto: 'bg-purple-950 text-purple-400 border border-purple-800',
  forex: 'bg-cyan-950 text-cyan-400 border border-cyan-800',
};
const GROUP_LABELS: Record<string, string> = {
  stock: 'STOCKS (NSE / BSE)',
  crypto: 'CRYPTO',
  forex: 'FOREX & COMMODITIES',
};

export const InstrumentSearch: React.FC<InstrumentSearchProps> = ({ watchlist, onRefresh }) => {
  const { theme } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ stocks: SearchResult[]; crypto: SearchResult[]; forex: SearchResult[] } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [addingSymbol, setAddingSymbol] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const watchlistSymbols = new Set(watchlist.map((w) => w.symbol.toUpperCase()));

  const allResults: SearchResult[] = results
    ? [...results.stocks, ...results.crypto, ...results.forex]
    : [];

  const hasAnyResults =
    results &&
    (results.stocks.length > 0 || results.crypto.length > 0 || results.forex.length > 0);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults(null);
      setIsOpen(false);
      return;
    }
    setIsSearching(true);
    setIsOpen(true);
    try {
      const data = await api.searchInstruments(q.trim());
      setResults(data);
      setFocusedIndex(-1);
    } catch {
      setResults({ stocks: [], crypto: [], forex: [] });
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults(null);
      setIsOpen(false);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    debounceRef.current = setTimeout(() => doSearch(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || allResults.length === 0) return;
    if (e.key === 'Escape') {
      setIsOpen(false);
      setFocusedIndex(-1);
      inputRef.current?.blur();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((i) => Math.min(i + 1, allResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < allResults.length) {
        handleSelectResult(allResults[focusedIndex]);
      }
    }
  };

  const handleSelectResult = async (result: SearchResult) => {
    if (addingSymbol) return;
    const upperSymbol = result.symbol.toUpperCase();
    if (watchlistSymbols.has(upperSymbol)) return;

    setAddingSymbol(upperSymbol);
    setAddError(null);
    setIsOpen(false);
    setQuery('');
    setResults(null);

    try {
      // Step 1: Verify live data is actually reachable before inserting
      const quote = await api.getQuote(result.symbol, result.assetType);
      if (quote.error && (!quote.price || quote.price === 0)) {
        setAddError(
          `Couldn't load live data for ${result.symbol} right now — try again shortly.`
        );
        setAddingSymbol(null);
        setTimeout(() => setAddError(null), 5000);
        return;
      }

      // Step 2: Both search match AND live quote succeeded — safe to add
      await api.addToWatchlist(result.symbol, result.name, result.assetType);
      setAddSuccess(`${result.name} (${result.symbol}) added to Watchlist!`);
      onRefresh();
      setTimeout(() => setAddSuccess(null), 3000);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      const msg =
        axiosErr.response?.data?.error ||
        `Failed to add ${result.symbol} to watchlist.`;
      setAddError(msg);
      setTimeout(() => setAddError(null), 5000);
    } finally {
      setAddingSymbol(null);
    }
  };

  const renderGroup = (
    groupKey: 'stocks' | 'crypto' | 'forex',
    items: SearchResult[],
    flatOffset: number
  ) => {
    if (!items || items.length === 0) return null;
    const assetType: 'stock' | 'crypto' | 'forex' =
      groupKey === 'stocks' ? 'stock' : groupKey === 'crypto' ? 'crypto' : 'forex';

    return (
      <div key={groupKey}>
        {/* Group header */}
        <div
          className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border-b ${
            theme === 'light'
              ? 'text-slate-500 bg-slate-50 border-slate-200'
              : 'text-slate-500 bg-slate-900/60 border-slate-800'
          }`}
        >
          {GROUP_LABELS[assetType]}
        </div>

        {items.map((item, idx) => {
          const globalIdx = flatOffset + idx;
          const alreadyIn = watchlistSymbols.has(item.symbol.toUpperCase());
          const isFocused = focusedIndex === globalIdx;

          return (
            <button
              key={item.symbol}
              onMouseDown={(e) => {
                e.preventDefault();
                if (!alreadyIn) handleSelectResult(item);
              }}
              onMouseEnter={() => setFocusedIndex(globalIdx)}
              disabled={alreadyIn || addingSymbol === item.symbol.toUpperCase()}
              className={`w-full text-left px-3 py-2.5 flex items-center justify-between gap-2 transition-colors text-xs border-b last:border-b-0 ${
                theme === 'light' ? 'border-slate-100' : 'border-slate-800/60'
              } ${
                alreadyIn
                  ? theme === 'light'
                    ? 'opacity-50 cursor-not-allowed bg-slate-50'
                    : 'opacity-40 cursor-not-allowed'
                  : isFocused
                  ? theme === 'light'
                    ? 'bg-blue-50 cursor-pointer'
                    : 'bg-slate-700/60 cursor-pointer'
                  : theme === 'light'
                  ? 'hover:bg-slate-50 cursor-pointer'
                  : 'hover:bg-slate-800/40 cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                    theme === 'light' ? BADGE_LIGHT[assetType] : BADGE_DARK[assetType]
                  }`}
                >
                  {assetType === 'stock' ? 'STK' : assetType === 'crypto' ? 'CRY' : 'FX'}
                </span>
                <div className="min-w-0">
                  <div
                    className={`font-bold font-mono truncate ${
                      theme === 'light' ? 'text-slate-900' : 'text-slate-100'
                    }`}
                  >
                    {item.symbol}
                  </div>
                  <div
                    className={`text-[10px] font-sans truncate ${
                      theme === 'light' ? 'text-slate-600' : 'text-slate-400'
                    }`}
                  >
                    {item.name}
                  </div>
                </div>
              </div>

              <div className="shrink-0">
                {alreadyIn ? (
                  <span
                    className={`text-[10px] font-semibold font-sans flex items-center gap-1 ${
                      theme === 'light' ? 'text-emerald-700' : 'text-emerald-400'
                    }`}
                  >
                    <CheckCircle className="w-3 h-3" />
                    In Watchlist
                  </span>
                ) : item.exchange ? (
                  <span
                    className={`text-[10px] font-mono ${
                      theme === 'light' ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    {item.exchange}
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const stocksOffset = 0;
  const cryptoOffset = results?.stocks.length ?? 0;
  const forexOffset = cryptoOffset + (results?.crypto.length ?? 0);

  return (
    <div className="relative w-full sm:w-80">
      {/* Search input */}
      <div className="relative">
        <Search
          className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${
            theme === 'light' ? 'text-slate-400' : 'text-slate-500'
          }`}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results && hasAnyResults) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search instrument (e.g. tata, bitcoin, eur)..."
          className={`w-full py-1.5 pl-8 pr-8 rounded text-xs font-mono border outline-none transition-all ${
            theme === 'light'
              ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-200'
              : 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-900'
          }`}
          autoComplete="off"
          spellCheck={false}
        />
        {isSearching && (
          <Loader2
            className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin ${
              theme === 'light' ? 'text-blue-500' : 'text-blue-400'
            }`}
          />
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          style={{ animation: 'dropdownFadeIn 150ms ease-out' }}
          className={`absolute top-full left-0 right-0 mt-1 z-50 rounded border shadow-xl overflow-hidden max-h-80 overflow-y-auto ${
            theme === 'light'
              ? 'bg-white border-slate-300 shadow-slate-200'
              : 'bg-slate-900 border-slate-700 shadow-black/60'
          }`}
        >
          {isSearching ? (
            <div
              className={`px-4 py-4 text-xs flex items-center gap-2 ${
                theme === 'light' ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Searching instruments...
            </div>
          ) : !hasAnyResults ? (
            <div
              className={`px-4 py-4 text-xs flex items-start gap-2 ${
                theme === 'light' ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                No matching instrument found. Only real, verified instruments can be added.
              </span>
            </div>
          ) : (
            <>
              {renderGroup('stocks', results?.stocks ?? [], stocksOffset)}
              {renderGroup('crypto', results?.crypto ?? [], cryptoOffset)}
              {renderGroup('forex', results?.forex ?? [], forexOffset)}
            </>
          )}
        </div>
      )}

      {/* Verifying state */}
      {addingSymbol && (
        <div
          className={`absolute top-full left-0 right-0 mt-1 z-50 rounded border px-3 py-2.5 text-xs flex items-center gap-2 ${
            theme === 'light'
              ? 'bg-blue-50 border-blue-200 text-blue-800'
              : 'bg-slate-900 border-slate-700 text-blue-300'
          }`}
        >
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          Verifying live data for {addingSymbol}...
        </div>
      )}

      {/* Error toast */}
      {addError && !addingSymbol && (
        <div
          className={`absolute top-full left-0 right-0 mt-1 z-50 rounded border px-3 py-2 text-xs flex items-start gap-2 ${
            theme === 'light'
              ? 'bg-rose-50 border-rose-300 text-rose-800'
              : 'bg-rose-950/80 border-rose-800 text-rose-300'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          {addError}
        </div>
      )}

      {/* Success toast */}
      {addSuccess && !addingSymbol && (
        <div
          className={`absolute top-full left-0 right-0 mt-1 z-50 rounded border px-3 py-2 text-xs flex items-center gap-2 ${
            theme === 'light'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
          }`}
        >
          <CheckCircle className="w-3.5 h-3.5 shrink-0" />
          {addSuccess}
        </div>
      )}

      {/* Hint text */}
      {!isOpen && !addingSymbol && !addError && !addSuccess && query.length === 0 && (
        <p
          className={`text-[10px] mt-1 font-sans ${
            theme === 'light' ? 'text-slate-400' : 'text-slate-600'
          }`}
        >
          Type 2+ characters to search NSE stocks, crypto, or forex
        </p>
      )}

      <style>{`
        @keyframes dropdownFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
