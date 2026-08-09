import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import type { Trade } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import {
  Calculator, Settings, Lock, AlertCircle, TrendingUp,
  ChevronDown, ChevronUp, History, Info, X, BookOpen
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CalcPrefill {
  instrument?: string;
  entryPrice?: number;
  stopLoss?: number;
  target?: number;
  positionSize?: number;
  votingMode?: string;
}

type CalcMode = 'day' | 'swing' | 'investing';

interface RiskCalculatorProps {
  initialPrice?: number;
  initialInstrument?: string;
  initialMode?: CalcMode;
  initialEntry?: number;
  initialStop?: number;
  initialTarget?: number;
  onUseNumbers?: (prefill: CalcPrefill) => void;
  onClose?: () => void;
  isModal?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MODE_CONFIG: Record<CalcMode, { label: string; riskMin: number; riskMax: number; note: string }> = {
  day: {
    label: 'Day Trading',
    riskMin: 0.5,
    riskMax: 1,
    note: 'Day trading involves more frequent trades; smaller per-trade risk helps protect capital across a higher number of trades.',
  },
  swing: {
    label: 'Swing Trading',
    riskMin: 1,
    riskMax: 2,
    note: 'Swing trades are held longer with wider stops; a moderate per-trade risk is common, but should reflect your own comfort with drawdown.',
  },
  investing: {
    label: 'Investing',
    riskMin: 0,
    riskMax: 0,
    note: 'Position sizing for long-term investing is typically about portfolio allocation (e.g. what % of your total portfolio this position represents) rather than a stop-loss-based risk %. Consider it in terms of overall diversification rather than a per-trade risk figure.',
  },
};

const ACCOUNT_STORAGE_KEY = 'trading_account_settings';
const MIN_HISTORY_TRADES = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadAccountSettings(): { accountSize: number; currency: '₹' | '$' } {
  try {
    const raw = localStorage.getItem(ACCOUNT_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { accountSize: 100000, currency: '₹' };
}

function saveAccountSettings(settings: { accountSize: number; currency: '₹' | '$' }) {
  try {
    localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify({ ...settings, lastUpdated: new Date().toISOString() }));
  } catch { /* ignore */ }
}

function fmt(n: number, currency: string, decimals = 2): string {
  if (!isFinite(n)) return '—';
  return `${currency}${n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

// ─── Historical Stats ─────────────────────────────────────────────────────────

interface HistoricalStats {
  total: number;
  wins: number;
  winRate: number;
  avgRRWin: number;
  avgRRLoss: number;
}

function computeHistoricalStats(
  trades: Trade[],
  mode: CalcMode,
  instrument?: string,
  filterByInstrument = false
): { stats: HistoricalStats | null; matchCount: number } {
  const modeLabel = MODE_CONFIG[mode].label;
  const closed = trades.filter(t => {
    if (t.status !== 'closed' || t.exit_price == null) return false;
    if (t.voting_mode && !t.voting_mode.includes(modeLabel)) return false;
    if (filterByInstrument && instrument) {
      if (t.instrument.toUpperCase() !== instrument.toUpperCase()) return false;
    }
    return true;
  });

  const matchCount = closed.length;
  if (matchCount < MIN_HISTORY_TRADES) return { stats: null, matchCount };

  const wins = closed.filter(t => (t.calculatedPnl ?? 0) > 0);
  const losses = closed.filter(t => (t.calculatedPnl ?? 0) <= 0);
  const avgRRWin = wins.length > 0
    ? wins.reduce((acc, t) => acc + (t.riskRewardRatio ?? 0), 0) / wins.length : 0;
  const avgRRLoss = losses.length > 0
    ? losses.reduce((acc, t) => acc + Math.abs(t.riskRewardRatio ?? 0), 0) / losses.length : 0;

  return {
    stats: {
      total: matchCount,
      wins: wins.length,
      winRate: Math.round((wins.length / matchCount) * 100),
      avgRRWin: Number(avgRRWin.toFixed(2)),
      avgRRLoss: Number(avgRRLoss.toFixed(2)),
    },
    matchCount,
  };
}

// ─── Main Component ──────────────────────────────────────────────────────────

export const RiskCalculator: React.FC<RiskCalculatorProps> = ({
  initialPrice,
  initialInstrument,
  initialMode = 'day',
  initialEntry,
  initialStop,
  initialTarget,
  onUseNumbers,
  onClose,
  isModal = false,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [accountSize, setAccountSize] = useState<number>(loadAccountSettings().accountSize);
  const [currency, setCurrency] = useState<'₹' | '$'>(loadAccountSettings().currency);
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [accountSizeInput, setAccountSizeInput] = useState<string>(String(loadAccountSettings().accountSize));
  const [mode, setMode] = useState<CalcMode>(initialMode);
  const [riskPctInput, setRiskPctInput] = useState<string>('');
  const [confirmedRiskPct, setConfirmedRiskPct] = useState<number | null>(null);

  const resolvedEntry = initialEntry ?? (initialPrice && initialPrice > 0 ? initialPrice : undefined);
  const [entryPrice, setEntryPrice] = useState<string>(resolvedEntry ? String(resolvedEntry) : '');
  const [stopLoss, setStopLoss] = useState<string>(initialStop ? String(initialStop) : '');
  const [target, setTarget] = useState<string>(initialTarget ? String(initialTarget) : '');

  const [trades, setTrades] = useState<Trade[]>([]);
  const [filterByInstrument, setFilterByInstrument] = useState(false);
  const [showHistoricalDetails, setShowHistoricalDetails] = useState(true);

  useEffect(() => { api.getTrades().then(setTrades).catch(() => {}); }, []);
  useEffect(() => { saveAccountSettings({ accountSize, currency }); }, [accountSize, currency]);

  // Sync if parent updates the initial prefill values (e.g. user clicks "Use Sell levels" after "Use Buy")
  useEffect(() => {
    if (initialEntry !== undefined) setEntryPrice(String(initialEntry));
    if (initialStop !== undefined) setStopLoss(String(initialStop));
    if (initialTarget !== undefined) setTarget(String(initialTarget));
  }, [initialEntry, initialStop, initialTarget]);

  const entry = parseFloat(entryPrice) || 0;
  const stop = parseFloat(stopLoss) || 0;
  const tgt = parseFloat(target) || 0;
  const riskPct = confirmedRiskPct ?? 0;
  const hasValidInputs = entry > 0 && stop > 0 && entry !== stop && riskPct > 0 && accountSize > 0;
  const hasTarget = tgt > 0 && tgt !== entry;

  const riskAmount = accountSize * (riskPct / 100);
  const riskPerUnit = Math.abs(entry - stop);
  const positionSize = hasValidInputs ? riskAmount / riskPerUnit : 0;
  const totalPositionValue = positionSize * entry;
  const rewardPerUnit = hasTarget ? Math.abs(tgt - entry) : 0;
  const rrRatio = rewardPerUnit > 0 ? rewardPerUnit / riskPerUnit : 0;
  const rewardAmount = positionSize * rewardPerUnit;
  const breakevenWinRate = riskPerUnit > 0 && rewardPerUnit > 0
    ? (riskPerUnit / (riskPerUnit + rewardPerUnit)) * 100 : null;
  const portfolioAllocation = mode === 'investing' && entry > 0 && positionSize > 0
    ? (totalPositionValue / accountSize) * 100 : null;

  const { stats: historicalStats, matchCount } = computeHistoricalStats(trades, mode, initialInstrument, filterByInstrument);

  const handleSaveAccountSize = () => {
    const v = parseFloat(accountSizeInput);
    if (v > 0) { setAccountSize(v); setIsEditingAccount(false); }
  };

  const handleConfirmRisk = () => {
    const v = parseFloat(riskPctInput);
    if (v > 0 && v <= 100) setConfirmedRiskPct(v);
  };

  const handleModeChange = (m: CalcMode) => {
    setMode(m);
    setConfirmedRiskPct(null);
    setRiskPctInput('');
  };

  const handleUseNumbers = useCallback(() => {
    if (!onUseNumbers || !hasValidInputs) return;
    onUseNumbers({
      instrument: initialInstrument,
      entryPrice: entry,
      stopLoss: stop,
      target: hasTarget ? tgt : undefined,
      positionSize: Math.ceil(positionSize * 100) / 100,
      votingMode: MODE_CONFIG[mode].label,
    });
  }, [onUseNumbers, hasValidInputs, mode, entry, stop, tgt, positionSize, hasTarget, initialInstrument]);

  // ─── Style helpers ──────────────────────────────────────────────────────

  const card = isDark ? 'bg-slate-900 border border-slate-700/80' : 'bg-white border border-slate-300 shadow-xs';
  const innerCard = isDark ? 'bg-slate-800/60 border border-slate-700/60' : 'bg-slate-50 border border-slate-200';
  const labelCls = isDark ? 'text-slate-400' : 'text-slate-500';
  const headingCls = isDark ? 'text-slate-200' : 'text-slate-900';
  const mutedCls = isDark ? 'text-slate-500' : 'text-slate-500';
  const inputCls = `terminal-input w-full text-xs py-1.5 px-2.5 rounded border outline-none transition-all ${
    isDark ? 'bg-slate-900 border-slate-700 text-slate-100 focus:border-blue-500'
           : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-200'}`;
  const activeTabCls = 'bg-blue-600 text-white font-semibold shadow';
  const inactiveTabCls = isDark ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200';

  return (
    <div className={`rounded-lg space-y-4 font-mono text-xs ${isModal ? '' : card + ' p-5'}`}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          <div>
            <h2 className={`text-sm font-bold uppercase tracking-wide ${headingCls}`}>Position Sizing & Risk/Reward</h2>
            <p className={`text-[10px] font-sans ${mutedCls}`}>Pure arithmetic from your inputs — not advice, not a signal</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className={`p-1 rounded ${isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500'}`}>
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Account Settings */}
      <div className={`rounded-lg p-3 ${innerCard}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            <Settings className="w-3.5 h-3.5" /> Account Settings
          </span>
          <button
            onClick={() => { setIsEditingAccount(!isEditingAccount); setAccountSizeInput(String(accountSize)); }}
            className={`text-[10px] font-semibold px-2 py-0.5 rounded border transition-colors ${isDark ? 'border-slate-600 text-slate-400 hover:text-white hover:border-slate-500' : 'border-slate-300 text-slate-500 hover:text-slate-900'}`}
          >{isEditingAccount ? 'Cancel' : 'Edit'}</button>
        </div>
        {isEditingAccount ? (
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 p-1 rounded border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}>
              {(['₹', '$'] as const).map(c => (
                <button key={c} onClick={() => setCurrency(c)} className={`px-2 py-0.5 rounded text-xs font-bold ${currency === c ? 'bg-blue-600 text-white' : inactiveTabCls}`}>{c}</button>
              ))}
            </div>
            <input type="number" value={accountSizeInput} onChange={e => setAccountSizeInput(e.target.value)} className={`${inputCls} flex-1`} placeholder="Account size" />
            <button onClick={handleSaveAccountSize} className="px-3 py-1.5 rounded bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 transition-colors">Save</button>
          </div>
        ) : (
          <div className="flex items-center gap-6">
            <div>
              <span className={`text-[10px] block ${labelCls}`}>ACCOUNT SIZE</span>
              <span className={`text-base font-bold ${headingCls}`}>{fmt(accountSize, currency, 0)}</span>
            </div>
            <div>
              <span className={`text-[10px] block ${labelCls}`}>CURRENCY</span>
              <span className={`text-base font-bold ${isDark ? 'text-cyan-400' : 'text-blue-700'}`}>{currency}</span>
            </div>
          </div>
        )}
      </div>

      {/* Mode Selector */}
      <div>
        <span className={`text-[10px] uppercase font-bold tracking-wider mb-1.5 block ${labelCls}`}>Trading Mode</span>
        <div className={`flex items-center gap-1 p-1 rounded-md border text-xs ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
          {(['day', 'swing', 'investing'] as CalcMode[]).map(m => (
            <button key={m} onClick={() => handleModeChange(m)} className={`flex-1 py-1.5 px-2 rounded text-xs font-bold transition-all ${mode === m ? activeTabCls : inactiveTabCls}`}>
              {MODE_CONFIG[m].label}
            </button>
          ))}
        </div>
      </div>

      {/* Risk % Suggester */}
      <div className={`rounded-lg p-3 ${innerCard}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Risk % per Trade</span>
          {confirmedRiskPct !== null && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-600/20 border border-emerald-600/40 text-emerald-400 font-bold flex items-center gap-1">
              <Lock className="w-3 h-3" /> {confirmedRiskPct}% Confirmed
            </span>
          )}
        </div>
        {mode === 'investing' ? (
          <div className={`p-2.5 rounded border text-[11px] font-sans leading-relaxed ${isDark ? 'bg-amber-950/30 border-amber-800/40 text-amber-300' : 'bg-amber-50 border-amber-300 text-amber-900'}`}>
            <Info className="w-3.5 h-3.5 inline mr-1" />{MODE_CONFIG.investing.note}
          </div>
        ) : (
          <>
            <div className={`p-2 rounded border mb-2 text-[11px] font-sans ${isDark ? 'bg-slate-800/60 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>
              <span className={`font-bold ${isDark ? 'text-cyan-400' : 'text-blue-700'}`}>Common starting range for {MODE_CONFIG[mode].label}: {MODE_CONFIG[mode].riskMin}%–{MODE_CONFIG[mode].riskMax}%</span><br />
              <span className={`text-[10px] ${mutedCls}`}>{MODE_CONFIG[mode].note}</span><br />
              <span className={`text-[10px] italic mt-1 block ${mutedCls}`}>These are common rule-of-thumb ranges, not rules — your actual risk tolerance determines what's right for you.</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {[MODE_CONFIG[mode].riskMin, (MODE_CONFIG[mode].riskMin + MODE_CONFIG[mode].riskMax) / 2, MODE_CONFIG[mode].riskMax].map(v => (
                  <button key={v} onClick={() => setRiskPctInput(String(v))} className={`px-2 py-1 rounded border text-[11px] font-bold transition-colors ${isDark ? 'border-slate-600 text-slate-400 hover:border-cyan-500 hover:text-cyan-400' : 'border-slate-300 text-slate-600 hover:border-blue-500 hover:text-blue-700'}`}>{v}%</button>
                ))}
              </div>
              <input type="number" step="0.1" min="0.1" max="100" value={riskPctInput} onChange={e => setRiskPctInput(e.target.value)} placeholder="Enter %" className={`${inputCls} flex-1`} />
              <button onClick={handleConfirmRisk} disabled={!riskPctInput || parseFloat(riskPctInput) <= 0} className="px-3 py-1.5 rounded bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1">
                <Lock className="w-3 h-3" /> Lock In
              </button>
            </div>
          </>
        )}
      </div>

      {/* Trade Inputs */}
      <div>
        <span className={`text-[10px] uppercase font-bold tracking-wider mb-2 block ${labelCls}`}>Trade Parameters</span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'Entry Price', val: entryPrice, set: setEntryPrice, ph: `e.g. ${currency}1300` },
            { label: 'Stop Loss', val: stopLoss, set: setStopLoss, ph: `e.g. ${currency}1270` },
            { label: 'Target Price', val: target, set: setTarget, ph: `e.g. ${currency}1390` },
          ].map(({ label, val, set, ph }) => (
            <div key={label}>
              <label className={`text-[10px] uppercase font-bold block mb-1 ${labelCls}`}>{label}</label>
              <input type="number" step="any" value={val} onChange={e => set(e.target.value)} placeholder={ph} className={inputCls} />
            </div>
          ))}
        </div>
      </div>

      {/* Calculation Output */}
      {hasValidInputs ? (
        <div className={`rounded-lg p-4 border-l-4 ${isDark ? 'bg-slate-800/50 border-l-blue-500 border border-slate-700' : 'bg-blue-50 border-l-blue-500 border border-blue-200'}`}>
          <div className="flex items-center gap-1.5 mb-3">
            <TrendingUp className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
            <span className={`text-[11px] font-bold uppercase tracking-wide ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              POSITION SIZING & RISK:REWARD — [{MODE_CONFIG[mode].label}]
            </span>
          </div>
          <div className={`text-[10px] mb-3 pb-2 border-b font-sans ${isDark ? 'border-slate-700 text-slate-300' : 'border-blue-200 text-slate-700'}`}>
            Account: <strong>{fmt(accountSize, currency, 0)}</strong> · Risk: <strong>{confirmedRiskPct}% ({fmt(riskAmount, currency)})</strong> · Entry: <strong>{fmt(entry, currency)}</strong> · Stop: <strong>{fmt(stop, currency)}</strong>{hasTarget && <> · Target: <strong>{fmt(tgt, currency)}</strong></>}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <div className={`p-2.5 rounded border ${isDark ? 'bg-slate-900/60 border-slate-700' : 'bg-white border-blue-200'}`}>
              <span className={`text-[10px] uppercase block ${labelCls}`}>Position Size</span>
              <div className={`text-lg font-bold mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>{positionSize.toFixed(2)}</div>
              <span className={`text-[10px] ${mutedCls}`}>units / shares</span>
            </div>
            <div className={`p-2.5 rounded border ${isDark ? 'bg-slate-900/60 border-slate-700' : 'bg-white border-blue-200'}`}>
              <span className={`text-[10px] uppercase block ${labelCls}`}>Total Position</span>
              <div className={`text-lg font-bold mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>{fmt(totalPositionValue, currency, 0)}</div>
              <span className={`text-[10px] ${mutedCls}`}>@ {fmt(entry, currency)} each</span>
            </div>
            <div className={`p-2.5 rounded border ${isDark ? 'bg-rose-950/40 border-rose-800/50' : 'bg-rose-50 border-rose-200'}`}>
              <span className={`text-[10px] uppercase block ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>Risk Amount</span>
              <div className={`text-lg font-bold mt-0.5 ${isDark ? 'text-rose-300' : 'text-rose-700'}`}>{fmt(riskAmount, currency)}</div>
              <span className={`text-[10px] ${isDark ? 'text-rose-500' : 'text-rose-400'}`}>{fmt(riskPerUnit, currency)} / unit</span>
            </div>
            {hasTarget ? (
              <div className={`p-2.5 rounded border ${isDark ? 'bg-emerald-950/40 border-emerald-800/50' : 'bg-emerald-50 border-emerald-200'}`}>
                <span className={`text-[10px] uppercase block ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Target Reward</span>
                <div className={`text-lg font-bold mt-0.5 ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>{fmt(rewardAmount, currency)}</div>
                <span className={`text-[10px] ${isDark ? 'text-emerald-500' : 'text-emerald-400'}`}>{fmt(rewardPerUnit, currency)} / unit</span>
              </div>
            ) : (
              <div className={`p-2.5 rounded border ${isDark ? 'bg-slate-900/40 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
                <span className={`text-[10px] uppercase block ${labelCls}`}>Target Reward</span>
                <div className={`text-sm mt-0.5 italic ${mutedCls}`}>Add target price</div>
              </div>
            )}
          </div>

          {hasTarget && (
            <div className={`rounded-lg p-3 mb-3 border ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <span className={`text-[10px] uppercase font-bold block ${labelCls}`}>Risk : Reward Ratio</span>
                  <div className={`text-2xl font-bold mt-0.5 ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>1 : {rrRatio.toFixed(2)}</div>
                  <p className={`text-[11px] font-sans mt-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    Risking <strong>{fmt(riskAmount, currency)}</strong> to target <strong>{fmt(rewardAmount, currency)}</strong>
                  </p>
                </div>
                {breakevenWinRate !== null && (
                  <div className="text-right">
                    <span className={`text-[10px] uppercase font-bold block ${labelCls}`}>Breakeven Win Rate</span>
                    <div className={`text-2xl font-bold mt-0.5 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{breakevenWinRate.toFixed(1)}%</div>
                    <p className={`text-[11px] font-sans mt-1 max-w-xs text-right ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Mathematical breakeven — not a prediction</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {mode === 'investing' && portfolioAllocation !== null && (
            <div className={`p-2.5 rounded border mb-3 ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <span className={`text-[10px] uppercase font-bold block ${labelCls}`}>Portfolio Allocation</span>
              <div className={`text-lg font-bold ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>{portfolioAllocation.toFixed(2)}%</div>
              <p className={`text-[11px] font-sans ${mutedCls}`}>of your {fmt(accountSize, currency, 0)} account in this single position</p>
            </div>
          )}

          {onUseNumbers && (
            <button onClick={handleUseNumbers} className="w-full py-2.5 px-4 rounded font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow transition-all flex items-center justify-center gap-2">
              <BookOpen className="w-4 h-4" />
              Use These Numbers → Pre-fill Journal Entry
            </button>
          )}
        </div>
      ) : (
        <div className={`rounded-lg p-4 border border-dashed text-center ${isDark ? 'border-slate-700 text-slate-500' : 'border-slate-300 text-slate-400'}`}>
          <Calculator className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-[11px] font-sans">
            {!confirmedRiskPct
              ? mode === 'investing' ? 'Enter entry price, stop, and target to see position sizing'
                : 'Set and lock in your Risk % first, then enter entry price and stop loss'
              : 'Enter entry price and stop loss to see calculations'}
          </p>
        </div>
      )}

      {/* Historical Win Rate */}
      <div className={`rounded-lg border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
        <button onClick={() => setShowHistoricalDetails(!showHistoricalDetails)}
          className={`w-full flex items-center justify-between px-4 py-2.5 rounded-t-lg ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'} transition-colors`}>
          <span className={`text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            <History className="w-3.5 h-3.5" /> Your Historical Data — {MODE_CONFIG[mode].label}
          </span>
          {showHistoricalDetails ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
        </button>
        {showHistoricalDetails && (
          <div className={`px-4 pb-4 space-y-3 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            {initialInstrument && (
              <div className="flex items-center gap-2 pt-3">
                <label className={`flex items-center gap-2 cursor-pointer text-[11px] font-sans ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  <input type="checkbox" checked={filterByInstrument} onChange={e => setFilterByInstrument(e.target.checked)} className="accent-blue-500" />
                  Filter to {initialInstrument} only
                </label>
              </div>
            )}
            {historicalStats !== null ? (
              <>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {[
                    { label: 'Win Rate', val: `${historicalStats.winRate}%`, sub: `${historicalStats.wins} of ${historicalStats.total}`, col: isDark ? 'text-emerald-400' : 'text-emerald-700' },
                    { label: 'Avg R:R (Wins)', val: `1:${historicalStats.avgRRWin}`, sub: 'on winning trades', col: isDark ? 'text-amber-400' : 'text-amber-700' },
                    { label: 'Avg R:R (Losses)', val: `1:${historicalStats.avgRRLoss}`, sub: 'on losing trades', col: isDark ? 'text-rose-400' : 'text-rose-600' },
                  ].map(({ label, val, sub, col }) => (
                    <div key={label} className={`p-2.5 rounded border ${isDark ? 'bg-slate-900/60 border-slate-700' : 'bg-white border-slate-200'}`}>
                      <span className={`text-[10px] block uppercase ${labelCls}`}>{label}</span>
                      <div className={`text-lg font-bold mt-0.5 ${col}`}>{val}</div>
                      <span className={`text-[10px] ${mutedCls}`}>{sub}</span>
                    </div>
                  ))}
                </div>
                <div className={`p-3 rounded border text-[11px] font-sans flex items-start gap-2 ${isDark ? 'bg-amber-950/30 border-amber-800/40 text-amber-300' : 'bg-amber-50 border-amber-300 text-amber-900'}`}>
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>This reflects your own past trades only — it is not a prediction. Past results do not guarantee future outcomes, and small sample sizes can be misleading.</span>
                </div>
              </>
            ) : (
              <div className={`pt-3 p-3 rounded border text-[11px] font-sans flex items-start gap-2 ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                <History className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Not enough history yet. You have <strong>{matchCount}</strong> matching closed {MODE_CONFIG[mode].label} trade{matchCount !== 1 ? 's' : ''} (need {MIN_HISTORY_TRADES} to unlock this).</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
