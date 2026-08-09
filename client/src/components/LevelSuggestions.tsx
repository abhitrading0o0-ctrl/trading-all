import React, { useMemo, useState } from 'react';
import type { Candle, VolumeBar } from '../services/api';
import { computeLevelSuggestions } from './StrategyVotingPanel';
import type { ScenarioLevels, LevelSuggestions as LevelSuggestionsData } from './StrategyVotingPanel';
import type { VotingMode } from './StrategyVotingPanel';
import { useTheme } from '../context/ThemeContext';
import {
  Layers, ChevronDown, ChevronUp, AlertTriangle,
  TrendingUp, TrendingDown, ArrowRight, Info
} from 'lucide-react';

// ─── Props ────────────────────────────────────────────────────────────────────

interface LevelSuggestionsProps {
  candles: Candle[];
  volume: VolumeBar[];
  currentPrice: number;
  symbol: string;
  mode: VotingMode;
  currency?: string;
  onUseLevels?: (scenario: 'buy' | 'sell', levels: ScenarioLevels) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtNum(n: number, currency: string, decimals = 2): string {
  if (!isFinite(n) || isNaN(n)) return '—';
  return `${currency}${n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

// ─── Scenario Column ─────────────────────────────────────────────────────────

function ScenarioColumn({
  scenario,
  levels,
  currency,
  showReasoning,
  isDark,
  onUse,
}: {
  scenario: 'buy' | 'sell';
  levels: ScenarioLevels;
  currency: string;
  showReasoning: boolean;
  isDark: boolean;
  onUse?: () => void;
}) {
  const isBuy = scenario === 'buy';
  const accentColor = isBuy
    ? (isDark ? 'text-emerald-400' : 'text-emerald-700')
    : (isDark ? 'text-rose-400' : 'text-rose-700');
  const borderColor = isBuy
    ? (isDark ? 'border-emerald-800/50' : 'border-emerald-200')
    : (isDark ? 'border-rose-800/50' : 'border-rose-200');
  const bgColor = isBuy
    ? (isDark ? 'bg-emerald-950/20' : 'bg-emerald-50/60')
    : (isDark ? 'bg-rose-950/20' : 'bg-rose-50/60');
  const labelCls = isDark ? 'text-slate-400' : 'text-slate-500';
  const headingCls = isDark ? 'text-slate-200' : 'text-slate-800';
  const mutedCls = isDark ? 'text-slate-500' : 'text-slate-500';

  const rrColor = levels.rr >= 2 ? (isDark ? 'text-amber-300' : 'text-amber-700')
    : levels.rr >= 1 ? (isDark ? 'text-slate-200' : 'text-slate-700')
    : (isDark ? 'text-rose-400' : 'text-rose-600');

  return (
    <div className={`rounded-lg border p-3 flex flex-col gap-2.5 ${borderColor} ${bgColor}`}>
      {/* Header */}
      <div className={`flex items-center gap-2 pb-1.5 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
        {isBuy
          ? <TrendingUp className={`w-4 h-4 ${accentColor}`} />
          : <TrendingDown className={`w-4 h-4 ${accentColor}`} />}
        <span className={`text-xs font-bold uppercase tracking-wide ${accentColor}`}>
          {isBuy ? 'Buy Scenario' : 'Sell Scenario'}
        </span>
      </div>

      {/* Core levels */}
      <div className="space-y-1.5">
        {[
          { label: 'Entry', val: levels.entry },
          { label: isBuy ? 'Stop-Loss' : 'Stop-Loss', val: levels.stop, isStop: true },
          { label: 'Target', val: levels.target, isTarget: true },
        ].map(({ label, val, isStop, isTarget }) => (
          <div key={label} className="flex items-center justify-between">
            <span className={`text-[10px] uppercase font-bold ${labelCls}`}>{label}</span>
            <span className={`font-mono text-xs font-bold ${
              isStop ? (isDark ? 'text-rose-300' : 'text-rose-700')
              : isTarget ? (isDark ? 'text-emerald-300' : 'text-emerald-700')
              : headingCls
            }`}>
              {fmtNum(val, currency)}
            </span>
          </div>
        ))}
        <div className={`flex items-center justify-between pt-1 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
          <span className={`text-[10px] uppercase font-bold ${labelCls}`}>R:R (auto)</span>
          <span className={`font-mono text-xs font-bold ${rrColor}`}>1 : {levels.rr.toFixed(2)}</span>
        </div>
      </div>

      {/* Cluster note */}
      {levels.clusterNote && (
        <div className={`text-[10px] font-sans flex items-start gap-1 px-2 py-1.5 rounded border ${
          isDark ? 'bg-blue-950/30 border-blue-800/40 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <Info className="w-3 h-3 shrink-0 mt-0.5" />
          <span>{levels.clusterNote}</span>
        </div>
      )}

      {/* Expanded reasoning */}
      {showReasoning && (
        <div className={`text-[10px] font-sans rounded border p-2 space-y-1.5 ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className={`font-bold text-[10px] uppercase ${labelCls}`}>Entry reasoning</div>
          <p className={`${mutedCls} leading-relaxed`}>{levels.entrySource}</p>

          <div className={`font-bold text-[10px] uppercase mt-1.5 ${labelCls}`}>Stop-loss reasoning</div>
          {levels.stopSources.map((s, i) => (
            <div key={i} className="flex items-start gap-1">
              <span className={`${mutedCls} shrink-0`}>•</span>
              <span className={mutedCls}>{s.label}: <strong className={isDark ? 'text-slate-300' : 'text-slate-700'}>{fmtNum(s.value, currency)}</strong></span>
            </div>
          ))}
          {levels.stopSources.length > 1 && (
            <p className={`${mutedCls} italic`}>Stop is the simple average of the above: <strong className={isDark ? 'text-slate-300' : 'text-slate-700'}>{fmtNum(levels.stop, currency)}</strong></p>
          )}

          <div className={`font-bold text-[10px] uppercase mt-1.5 ${labelCls}`}>Target reasoning</div>
          <p className={`${mutedCls} leading-relaxed`}>{levels.targetSource}</p>
        </div>
      )}

      {/* Use button */}
      {onUse && (
        <button
          onClick={onUse}
          className={`w-full py-1.5 px-3 rounded text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all ${
            isBuy
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
              : 'bg-rose-600 hover:bg-rose-500 text-white'
          }`}
        >
          Use {isBuy ? 'Buy' : 'Sell'} Levels
          <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export const LevelSuggestions: React.FC<LevelSuggestionsProps> = ({
  candles,
  volume,
  currentPrice,
  symbol,
  mode,
  currency = '₹',
  onUseLevels,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [showReasoning, setShowReasoning] = useState(false);

  const suggestions: LevelSuggestionsData = useMemo(
    () => computeLevelSuggestions(mode, candles, volume, currentPrice),
    [mode, candles, volume, currentPrice]
  );

  const labelCls = isDark ? 'text-slate-400' : 'text-slate-500';
  const headingCls = isDark ? 'text-slate-200' : 'text-slate-900';
  const borderT = isDark ? 'border-slate-700' : 'border-slate-200';

  return (
    <div className={`terminal-card p-4 space-y-4 font-mono transition-colors border-l-4 ${
      isDark ? 'border-l-amber-500 bg-[#05070c]' : 'border-l-amber-500 bg-white shadow-sm'
    }`}>
      {/* Header */}
      <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3 ${borderT}`}>
        <div>
          <div className="flex items-center gap-2">
            <Layers className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
            <h2 className={`text-xs font-bold uppercase tracking-wider ${headingCls}`}>
              SUGGESTED LEVELS — {symbol} — {mode === 'day' ? 'Day Trading' : mode === 'swing' ? 'Swing Trading' : 'Investing'}
            </h2>
          </div>
          <p className={`text-[11px] font-sans mt-0.5 ${labelCls}`}>
            Derived from existing indicator values in this app — both directions always shown regardless of vote tally
          </p>
        </div>
        <button
          onClick={() => setShowReasoning(!showReasoning)}
          className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded border transition-colors shrink-0 ${
            isDark
              ? 'border-slate-600 text-slate-400 hover:text-white hover:border-slate-500'
              : 'border-slate-300 text-slate-600 hover:text-slate-900 hover:border-slate-400'
          }`}
        >
          {showReasoning ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {showReasoning ? 'Hide reasoning' : 'Show reasoning ▾'}
        </button>
      </div>

      {/* Investing mode — not applicable */}
      {mode === 'investing' ? (
        <div className={`rounded-lg p-4 border text-[12px] font-sans leading-relaxed ${isDark ? 'bg-amber-950/30 border-amber-800/40 text-amber-300' : 'bg-amber-50 border-amber-300 text-amber-900'}`}>
          <Info className="w-4 h-4 inline mr-2 shrink-0" />
          <strong>Investing mode is based on fundamentals, not short-term price structure.</strong> Consider entry timing based on valuation
          (see the Voting Panel's P/E and P/B checks) rather than a technical stop-loss/target.
          ATR-based or swing-based levels are not shown for Investing mode — an honest "not applicable" is more useful than a fabricated technical number.
        </div>
      ) : suggestions.buy === null || suggestions.sell === null ? (
        <div className={`rounded-lg p-4 border text-center text-[12px] font-sans ${isDark ? 'border-slate-700 text-slate-500' : 'border-slate-200 text-slate-500'}`}>
          <Layers className="w-8 h-8 mx-auto mb-2 opacity-30" />
          Not enough candle data yet to compute levels — waiting for sufficient price history.
        </div>
      ) : (
        <>
          {/* Scenario columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ScenarioColumn
              scenario="buy"
              levels={suggestions.buy}
              currency={currency}
              showReasoning={showReasoning}
              isDark={isDark}
              onUse={onUseLevels ? () => onUseLevels('buy', suggestions.buy!) : undefined}
            />
            <ScenarioColumn
              scenario="sell"
              levels={suggestions.sell}
              currency={currency}
              showReasoning={showReasoning}
              isDark={isDark}
              onUse={onUseLevels ? () => onUseLevels('sell', suggestions.sell!) : undefined}
            />
          </div>

          {/* ATR reference */}
          {!showReasoning && (
            <p className={`text-[10px] font-sans text-center ${labelCls}`}>
              Click "Show reasoning ▾" to see which specific indicator values produced each level
            </p>
          )}
        </>
      )}

      {/* MANDATORY DISCLOSURE — always visible, non-collapsible */}
      <div className={`rounded-lg p-3 border flex items-start gap-2 text-[11px] font-sans ${
        isDark ? 'bg-slate-800/50 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-300 text-slate-600'
      }`}>
        <AlertTriangle className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
        <span>{suggestions.disclaimer}</span>
      </div>
    </div>
  );
};
