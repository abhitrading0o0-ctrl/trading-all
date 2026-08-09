import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import type { Trade, TradeStats } from '../services/api';
import { createChart, AreaSeries } from 'lightweight-charts';
import type { IChartApi } from 'lightweight-charts';
import {
  BookOpen, Plus, Trash2, Edit3,
  TrendingUp, RefreshCw, CheckCircle2, AlertTriangle, X, Cpu, Filter
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface TradeJournalProps {
  initialInstrument?: string;
  initialPrice?: number;
  initialVotingMode?: string;
  initialVoteTally?: string;
  initialVoteStrength?: number;
  initialStopLoss?: number;
  initialTarget?: number;
  initialPositionSize?: number;
  onTradeLogged?: () => void;
}

export const TradeJournal: React.FC<TradeJournalProps> = ({
  initialInstrument = '',
  initialPrice = 0,
  initialVotingMode = '',
  initialVoteTally = '',
  initialVoteStrength = 0,
  initialStopLoss = 0,
  initialTarget = 0,
  initialPositionSize = 0,
  onTradeLogged
}) => {
  const { theme } = useTheme();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<TradeStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState<boolean>(Boolean(initialInstrument));
  const [editingTradeId, setEditingTradeId] = useState<number | null>(null);

  const [instrument, setInstrument] = useState<string>(initialInstrument);
  const [direction, setDirection] = useState<'long' | 'short'>('long');
  const [entryPrice, setEntryPrice] = useState<string>(initialPrice > 0 ? String(initialPrice) : '');
  const [entryTime, setEntryTime] = useState<string>(new Date().toISOString().slice(0, 16));
  const [exitPrice, setExitPrice] = useState<string>('');
  const [exitTime, setExitTime] = useState<string>('');
  const [positionSize, setPositionSize] = useState<string>(initialPositionSize > 0 ? String(initialPositionSize) : '1');
  const [stopLoss, setStopLoss] = useState<string>(initialStopLoss > 0 ? String(initialStopLoss) : '');
  const [target, setTarget] = useState<string>(initialTarget > 0 ? String(initialTarget) : '');
  const [strategyTag, setStrategyTag] = useState<string>('Breakout');
  const [reasoning, setReasoning] = useState<string>('');
  const [winReason, setWinReason] = useState<string>('');
  const [lossReason, setLossReason] = useState<string>('');
  const [votingMode, setVotingMode] = useState<string>(initialVotingMode);
  const [voteTally, setVoteTally] = useState<string>(initialVoteTally);
  const [voteStrength, setVoteStrength] = useState<number>(initialVoteStrength);
  const [status, setStatus] = useState<'open' | 'closed'>('open');

  const [formError, setFormError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'entry_time' | 'instrument' | 'calculatedPnl'>('entry_time');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [voteFilter, setVoteFilter] = useState<'all' | 'high' | 'split'>('all');

  const equityChartContainerRef = useRef<HTMLDivElement>(null);
  const equityChartRef = useRef<IChartApi | null>(null);

  const fetchJournalData = async () => {
    setIsLoading(true);
    try {
      const [tradesRes, statsRes] = await Promise.all([
        api.getTrades(),
        api.getTradeStats()
      ]);
      setTrades(tradesRes);
      setStats(statsRes);
    } catch (err) {
      console.error('Error loading trade journal:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJournalData();
  }, []);

  // Handle Equity Curve Chart
  useEffect(() => {
    if (!equityChartContainerRef.current || !stats || !stats.equityCurve || stats.equityCurve.length === 0) return;

    if (equityChartRef.current) {
      try {
        equityChartRef.current.remove();
      } catch (e) { }
      equityChartRef.current = null;
    }

    const bgColor = theme === 'light' ? '#ffffff' : '#0f141d';
    const textColor = theme === 'light' ? '#475569' : '#94a3b8';
    const gridColor = theme === 'light' ? 'rgba(226, 232, 240, 0.8)' : 'rgba(38, 51, 71, 0.3)';

    const chart = createChart(equityChartContainerRef.current, {
      width: equityChartContainerRef.current.clientWidth,
      height: 220,
      layout: {
        background: { color: bgColor },
        textColor: textColor,
        fontSize: 11,
        fontFamily: 'Inter, sans-serif'
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor }
      },
      rightPriceScale: { borderColor: theme === 'light' ? '#cbd5e1' : '#263347' },
      timeScale: { borderColor: theme === 'light' ? '#cbd5e1' : '#263347' }
    });
    equityChartRef.current = chart;

    const lineSeries = chart.addSeries(AreaSeries, {
      topColor: stats.totalPnl >= 0 ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)',
      bottomColor: stats.totalPnl >= 0 ? 'rgba(34, 197, 94, 0.05)' : 'rgba(239, 68, 68, 0.05)',
      lineColor: stats.totalPnl >= 0 ? '#22c55e' : '#ef4444',
      lineWidth: 2,
      title: 'Cumulative P&L'
    });

    const curveData = stats.equityCurve.map((pt, idx) => ({
      time: (new Date(pt.time).getTime() / 1000 + idx) as any,
      value: pt.cumulativePnl
    }));

    lineSeries.setData(curveData);
    chart.timeScale().fitContent();

    const handleResize = () => {
      if (equityChartContainerRef.current && equityChartRef.current) {
        equityChartRef.current.applyOptions({ width: equityChartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (equityChartRef.current) {
        try {
          equityChartRef.current.remove();
        } catch (e) { }
        equityChartRef.current = null;
      }
    };
  }, [stats, theme]);

  const resetForm = () => {
    setEditingTradeId(null);
    setInstrument('');
    setDirection('long');
    setEntryPrice('');
    setEntryTime(new Date().toISOString().slice(0, 16));
    setExitPrice('');
    setExitTime('');
    setPositionSize('1');
    setStopLoss('');
    setTarget('');
    setStrategyTag('Breakout');
    setReasoning('');
    setWinReason('');
    setLossReason('');
    setVotingMode('');
    setVoteTally('');
    setVoteStrength(0);
    setStatus('open');
    setFormError(null);
  };

  const handleOpenEdit = (t: Trade) => {
    setEditingTradeId(t.id || null);
    setInstrument(t.instrument);
    setDirection(t.direction);
    setEntryPrice(String(t.entry_price));
    setEntryTime(t.entry_time.slice(0, 16));
    setExitPrice(t.exit_price != null ? String(t.exit_price) : '');
    setExitTime(t.exit_time ? t.exit_time.slice(0, 16) : '');
    setPositionSize(String(t.position_size));
    setStopLoss(t.stop_loss != null ? String(t.stop_loss) : '');
    setTarget(t.target != null ? String(t.target) : '');
    setStrategyTag(t.strategy_tag || 'General');
    setReasoning(t.reasoning || '');
    setWinReason(t.win_reason || '');
    setLossReason(t.loss_reason || '');
    setVotingMode(t.voting_mode || '');
    setVoteTally(t.vote_tally || '');
    setVoteStrength(t.vote_strength || 0);
    setStatus(t.status);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!instrument.trim() || !entryPrice || !positionSize) {
      setFormError('Instrument, Entry Price, and Position Size are required.');
      return;
    }

    const tradeData: Omit<Trade, 'id'> = {
      instrument: instrument.trim().toUpperCase(),
      direction,
      entry_price: parseFloat(entryPrice),
      entry_time: new Date(entryTime).toISOString(),
      exit_price: exitPrice ? parseFloat(exitPrice) : null,
      exit_time: exitTime ? new Date(exitTime).toISOString() : null,
      position_size: parseFloat(positionSize),
      stop_loss: stopLoss ? parseFloat(stopLoss) : null,
      target: target ? parseFloat(target) : null,
      strategy_tag: strategyTag.trim(),
      reasoning: reasoning.trim(),
      win_reason: winReason.trim(),
      loss_reason: lossReason.trim(),
      voting_mode: votingMode || null,
      vote_tally: voteTally || null,
      vote_strength: voteStrength || null,
      status: exitPrice ? 'closed' : status
    };

    try {
      if (editingTradeId) {
        await api.updateTrade(editingTradeId, tradeData);
      } else {
        await api.createTrade(tradeData);
      }
      setIsFormOpen(false);
      resetForm();
      fetchJournalData();
      if (onTradeLogged) onTradeLogged();
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to save trade entry.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this trade journal entry?')) return;
    try {
      await api.deleteTrade(id);
      fetchJournalData();
    } catch (err) {
      console.error('Failed to delete trade:', err);
    }
  };

  const winningTradesList = trades.filter(t => (t.calculatedPnl || 0) > 0 || (t.win_reason && t.win_reason.length > 0));
  const losingTradesList = trades.filter(t => (t.calculatedPnl || 0) < 0 || (t.loss_reason && t.loss_reason.length > 0));

  // Filter trades by vote strength
  const filteredTrades = trades.filter(t => {
    if (voteFilter === 'high') return (t.vote_strength || 0) >= 4;
    if (voteFilter === 'split') return (t.vote_strength || 0) > 0 && (t.vote_strength || 0) <= 3;
    return true;
  });

  const sortedTrades = [...filteredTrades].sort((a, b) => {
    let valA: any = a[sortBy];
    let valB: any = b[sortBy];

    if (sortBy === 'entry_time') {
      valA = new Date(a.entry_time).getTime();
      valB = new Date(b.entry_time).getTime();
    }

    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  const handleSort = (field: 'entry_time' | 'instrument' | 'calculatedPnl') => {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-6 animate-tab-fade">
      {/* Header Banner */}
      <div className={`terminal-card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-l-4 ${theme === 'light' ? 'border-l-blue-600 bg-white shadow-xs' : 'border-l-blue-500 bg-[#05070a]'
        }`}>
        <div>
          <h1 className={`text-lg font-bold flex items-center gap-2 font-mono ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
            <BookOpen className={`w-5 h-5 ${theme === 'light' ? 'text-blue-600' : 'text-blue-400'}`} />
            TRADE JOURNAL & CONSENSUS ANALYTICS
          </h1>
          <p className={`text-xs mt-1 font-mono ${theme === 'light' ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
            Log trades, capture active voting tallies at trade time, and empirically measure win-rate correlation against consensus strength.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono">
          <button
            onClick={fetchJournalData}
            className={`px-3 py-1.5 rounded text-xs border transition-colors flex items-center gap-1.5 ${theme === 'light'
                ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
              }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={() => {
              resetForm();
              setIsFormOpen(true);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold shadow transition-all ${theme === 'light'
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-blue-600 text-white hover:bg-blue-500'
              }`}
          >
            <Plus className="w-4 h-4" />
            Log New Trade
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
        <div className={`terminal-card p-3.5 border-l-2 border-l-blue-600 ${theme === 'light' ? 'bg-white shadow-xs' : ''}`}>
          <span className={`text-[11px] block uppercase font-bold ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Total Trades</span>
          <div className={`text-xl font-bold mt-1 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{stats?.totalTrades || 0}</div>
          <span className={`text-[10px] ${theme === 'light' ? 'text-slate-600 font-medium' : 'text-slate-500'}`}>{stats?.openTradesCount || 0} Open | {stats?.closedTradesCount || 0} Closed</span>
        </div>

        <div className={`terminal-card p-3.5 border-l-2 border-l-purple-500 ${theme === 'light' ? 'bg-white shadow-xs' : ''}`}>
          <span className={`text-[11px] block uppercase font-bold ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Win Rate</span>
          <div className={`text-xl font-bold mt-1 ${theme === 'light' ? 'text-purple-700' : 'text-purple-400'}`}>{stats?.winRate || 0}%</div>
          <span className={`text-[10px] ${theme === 'light' ? 'text-slate-600 font-medium' : 'text-slate-500'}`}>Closed positions</span>
        </div>

        <div className={`terminal-card p-3.5 border-l-2 border-l-amber-500 ${theme === 'light' ? 'bg-white shadow-xs' : ''}`}>
          <span className={`text-[11px] block uppercase font-bold ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Average R:R</span>
          <div className={`text-xl font-bold mt-1 ${theme === 'light' ? 'text-amber-700' : 'text-amber-400'}`}>{stats?.avgRR || 0} R</div>
          <span className={`text-[10px] ${theme === 'light' ? 'text-slate-600 font-medium' : 'text-slate-500'}`}>Risk-to-Reward Ratio</span>
        </div>

        <div className={`terminal-card p-3.5 border-l-2 border-l-emerald-500 ${theme === 'light' ? 'bg-white shadow-xs' : ''}`}>
          <span className={`text-[11px] block uppercase font-bold ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Best Trade</span>
          <div className={`text-xl font-bold mt-1 ${theme === 'light' ? 'text-emerald-700' : 'text-emerald-400'}`}>
            +${stats?.bestTradePnl?.toFixed(2) || '0.00'}
          </div>
          <span className={`text-[10px] ${theme === 'light' ? 'text-slate-600 font-medium' : 'text-slate-500'}`}>Highest gain</span>
        </div>

        <div className={`terminal-card p-3.5 border-l-2 border-l-rose-500 ${theme === 'light' ? 'bg-white shadow-xs' : ''}`}>
          <span className={`text-[11px] block uppercase font-bold ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Worst Trade</span>
          <div className={`text-xl font-bold mt-1 ${theme === 'light' ? 'text-rose-700' : 'text-rose-400'}`}>
            ${stats?.worstTradePnl?.toFixed(2) || '0.00'}
          </div>
          <span className={`text-[10px] ${theme === 'light' ? 'text-slate-600 font-medium' : 'text-slate-500'}`}>Highest drawdown</span>
        </div>

        <div className={`terminal-card p-3.5 border-l-2 border-l-blue-500 ${theme === 'light' ? 'bg-white shadow-xs' : ''}`}>
          <span className={`text-[11px] block uppercase font-bold ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Total Realized P&L</span>
          <div className={`text-xl font-bold mt-1 ${(stats?.totalPnl || 0) >= 0 ? (theme === 'light' ? 'text-emerald-700' : 'text-emerald-400') : (theme === 'light' ? 'text-rose-700' : 'text-rose-400')}`}>
            {(stats?.totalPnl || 0) >= 0 ? '+' : ''}${stats?.totalPnl?.toFixed(2) || '0.00'}
          </div>
          <span className={`text-[10px] ${theme === 'light' ? 'text-slate-600 font-medium' : 'text-slate-500'}`}>Cumulative net profit</span>
        </div>
      </div>

      {/* STRATEGY VOTE-STRENGTH CONSENSUS CORRELATION PANEL */}
      <div className={`terminal-card p-4 font-mono space-y-3 border-l-4 ${theme === 'light' ? 'border-l-blue-600 bg-white shadow-xs' : 'border-l-cyan-400'
        }`}>
        <div className={`flex items-center justify-between border-b pb-2 ${theme === 'light' ? 'border-slate-200' : 'border-dark-800'}`}>
          <div className="flex items-center gap-2">
            <Cpu className={`w-4 h-4 ${theme === 'light' ? 'text-blue-600' : 'text-cyan-400'}`} />
            <h2 className={`text-xs font-bold uppercase tracking-wider ${theme === 'light' ? 'text-slate-900' : 'text-slate-200'}`}>
              CONSENSUS STRENGTH VS PERFORMANCE CORRELATION
            </h2>
          </div>
          <span className={`text-[10px] font-sans ${theme === 'light' ? 'text-slate-600 font-medium' : 'text-slate-500'}`}>Empirical analysis comparing 4+ rule consensus vs 1-3 split</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className={`p-3 rounded border flex items-center justify-between ${theme === 'light' ? 'bg-emerald-50 border-emerald-300 shadow-xs' : 'bg-emerald-950/30 border-emerald-800/40'
            }`}>
            <div>
              <span className={`font-bold block ${theme === 'light' ? 'text-emerald-950' : 'text-emerald-300'}`}>High Consensus Trades (4+ / 5 Rules Agreed)</span>
              <span className={`text-[11px] ${theme === 'light' ? 'text-emerald-800 font-medium' : 'text-slate-400'}`}>Trades taken when mechanical rules heavily aligned</span>
            </div>
            <div className="text-right font-mono">
              <span className={`text-lg font-bold ${theme === 'light' ? 'text-emerald-800' : 'text-emerald-400'}`}>{stats?.highConsensusWinRate || 0}% Win Rate</span>
              <span className={`text-[10px] block ${theme === 'light' ? 'text-slate-600 font-semibold' : 'text-slate-400'}`}>{stats?.highConsensusCount || 0} trades evaluated</span>
            </div>
          </div>

          <div className={`p-3 rounded border flex items-center justify-between ${theme === 'light' ? 'bg-amber-50 border-amber-300 shadow-xs' : 'bg-amber-950/30 border-amber-800/40'
            }`}>
            <div>
              <span className={`font-bold block ${theme === 'light' ? 'text-amber-950' : 'text-amber-300'}`}>Split Consensus Trades (1–3 / 5 Rules Agreed)</span>
              <span className={`text-[11px] ${theme === 'light' ? 'text-amber-800 font-medium' : 'text-slate-400'}`}>Trades taken on lower consensus or mixed signals</span>
            </div>
            <div className="text-right font-mono">
              <span className={`text-lg font-bold ${theme === 'light' ? 'text-amber-800' : 'text-amber-400'}`}>{stats?.splitConsensusWinRate || 0}% Win Rate</span>
              <span className={`text-[10px] block ${theme === 'light' ? 'text-slate-600 font-semibold' : 'text-slate-400'}`}>{stats?.splitConsensusCount || 0} trades evaluated</span>
            </div>
          </div>
        </div>
      </div>

      {/* Equity Curve Chart */}
      <div className="terminal-card p-4 font-mono">
        <div className={`flex items-center justify-between mb-3 border-b pb-2 ${theme === 'light' ? 'border-slate-200' : 'border-dark-800'}`}>
          <div className="flex items-center gap-2">
            <TrendingUp className={`w-4 h-4 ${theme === 'light' ? 'text-emerald-600' : 'text-emerald-400'}`} />
            <h2 className={`text-xs font-bold uppercase tracking-wider ${theme === 'light' ? 'text-slate-900' : 'text-slate-200'}`}>
              CUMULATIVE P&L EQUITY CURVE
            </h2>
          </div>
          <span className={`text-[10px] ${theme === 'light' ? 'text-slate-600 font-semibold' : 'text-slate-500'}`}>Account Growth Trajectory</span>
        </div>
        <div ref={equityChartContainerRef} className={`w-full rounded border overflow-hidden ${theme === 'light' ? 'border-slate-300' : 'border-dark-800'}`} />
      </div>

      {/* Win & Loss Reflection Analytics Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
        {/* Win Reflection Card */}
        <div className={`terminal-card p-4 border-l-4 border-l-emerald-500 ${theme === 'light' ? 'bg-emerald-50/50 border-emerald-300' : 'bg-slate-900/90 border-slate-700'
          }`}>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className={`w-5 h-5 ${theme === 'light' ? 'text-emerald-700' : 'text-emerald-400'}`} />
            <h3 className={`text-sm font-bold uppercase tracking-wide ${theme === 'light' ? 'text-emerald-900' : 'text-emerald-400'}`}>WHY I WON (Winning Drivers & Strategies)</h3>
          </div>
          {winningTradesList.length === 0 ? (
            <p className={`text-xs italic ${theme === 'light' ? 'text-slate-600' : 'text-slate-500'}`}>No winning trade reflections logged yet.</p>
          ) : (
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {winningTradesList.map(t => (
                <div key={t.id} className={`p-2.5 rounded border text-xs ${theme === 'light' ? 'bg-emerald-100/70 border-emerald-300 text-slate-900' : 'bg-emerald-950/30 border-emerald-800/40'
                  }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-bold ${theme === 'light' ? 'text-emerald-950' : 'text-emerald-300'}`}>{t.instrument} ({t.direction.toUpperCase()})</span>
                    <span className={`font-bold ${theme === 'light' ? 'text-emerald-800' : 'text-emerald-400'}`}>+${t.calculatedPnl?.toFixed(2)}</span>
                  </div>
                  <p className={`text-[11px] font-sans italic ${theme === 'light' ? 'text-slate-700 font-medium' : 'text-slate-300'}`}>
                    "{t.win_reason || t.reasoning || 'Followed trading plan & risk management.'}"
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Loss Reflection Card */}
        <div className={`terminal-card p-4 border-l-4 border-l-rose-500 ${theme === 'light' ? 'bg-rose-50/50 border-rose-300' : 'bg-slate-900/90 border-slate-700'
          }`}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className={`w-5 h-5 ${theme === 'light' ? 'text-rose-700' : 'text-rose-400'}`} />
            <h3 className={`text-sm font-bold uppercase tracking-wide ${theme === 'light' ? 'text-rose-900' : 'text-rose-400'}`}>WHY I LOST (Loss Post-Mortem & Lessons)</h3>
          </div>
          {losingTradesList.length === 0 ? (
            <p className={`text-xs italic ${theme === 'light' ? 'text-slate-600' : 'text-slate-500'}`}>No losing trade post-mortems logged yet.</p>
          ) : (
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {losingTradesList.map(t => (
                <div key={t.id} className={`p-2.5 rounded border text-xs ${theme === 'light' ? 'bg-rose-100/70 border-rose-300 text-slate-900' : 'bg-rose-950/30 border-rose-800/40'
                  }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-bold ${theme === 'light' ? 'text-rose-950' : 'text-rose-300'}`}>{t.instrument} ({t.direction.toUpperCase()})</span>
                    <span className={`font-bold ${theme === 'light' ? 'text-rose-800' : 'text-rose-400'}`}>${t.calculatedPnl?.toFixed(2)}</span>
                  </div>
                  <p className={`text-[11px] font-sans italic ${theme === 'light' ? 'text-slate-700 font-medium' : 'text-slate-300'}`}>
                    "{t.loss_reason || t.reasoning || 'Market structure shift / stop hit.'}"
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Logged Trades Table with Vote Strength Filter */}
      <div className="terminal-card p-4 font-mono">
        <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3 pb-2 border-b ${theme === 'light' ? 'border-slate-200' : 'border-dark-800'
          }`}>
          <h2 className={`text-xs font-bold uppercase tracking-wider ${theme === 'light' ? 'text-slate-900' : 'text-slate-200'}`}>
            LOGGED TRADES & REFLECTION TABLE
          </h2>

          {/* Vote Strength Filter Controls */}
          <div className="flex items-center gap-2 text-xs">
            <Filter className={`w-3.5 h-3.5 ${theme === 'light' ? 'text-blue-600' : 'text-cyan-400'}`} />
            <span className={`text-[10px] uppercase font-bold ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>VOTE CONSENSUS FILTER:</span>
            <button
              onClick={() => setVoteFilter('all')}
              className={`px-2 py-1 rounded text-[11px] font-bold ${voteFilter === 'all'
                  ? (theme === 'light' ? 'bg-blue-600 text-white shadow' : 'bg-cyan-500 text-black')
                  : (theme === 'light' ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-200' : 'text-slate-400 hover:text-white')
                }`}
            >
              All Trades
            </button>
            <button
              onClick={() => setVoteFilter('high')}
              className={`px-2 py-1 rounded text-[11px] font-bold ${voteFilter === 'high'
                  ? (theme === 'light' ? 'bg-emerald-600 text-white shadow' : 'bg-emerald-500 text-black')
                  : (theme === 'light' ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-200' : 'text-slate-400 hover:text-white')
                }`}
            >
              High Consensus (4–5 Votes)
            </button>
            <button
              onClick={() => setVoteFilter('split')}
              className={`px-2 py-1 rounded text-[11px] font-bold ${voteFilter === 'split'
                  ? (theme === 'light' ? 'bg-amber-600 text-white shadow' : 'bg-amber-500 text-black')
                  : (theme === 'light' ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-200' : 'text-slate-400 hover:text-white')
                }`}
            >
              Split Consensus (1–3 Votes)
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={`border-b text-[11px] ${theme === 'light' ? 'border-slate-300 bg-slate-100 text-slate-800 font-bold' : 'border-dark-800 bg-dark-950 text-slate-400'
                }`}>
                <th className="py-2.5 px-3 cursor-pointer hover:text-blue-600" onClick={() => handleSort('entry_time')}>
                  DATE / TIME {sortBy === 'entry_time' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
                <th className="py-2.5 px-3 cursor-pointer hover:text-blue-600" onClick={() => handleSort('instrument')}>
                  INSTRUMENT {sortBy === 'instrument' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
                <th className="py-2.5 px-3">DIRECTION</th>
                <th className="py-2.5 px-3">ENTRY / EXIT</th>
                <th className="py-2.5 px-3 cursor-pointer hover:text-blue-600" onClick={() => handleSort('calculatedPnl')}>
                  P&L ($ / %) {sortBy === 'calculatedPnl' ? (sortAsc ? '↑' : '↓') : ''}
                </th>
                <th className="py-2.5 px-3">R:R</th>
                <th className="py-2.5 px-3">VOTING CONSENSUS AT ENTRY</th>
                <th className="py-2.5 px-3">WHY I WON / LOST</th>
                <th className="py-2.5 px-3 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${theme === 'light' ? 'divide-slate-200' : 'divide-dark-800/40'}`}>
              {sortedTrades.length === 0 ? (
                <tr>
                  <td colSpan={9} className={`py-6 text-center italic ${theme === 'light' ? 'text-slate-600' : 'text-slate-500'}`}>
                    No trades match the selected filter. Click "Log New Trade" to record your entry.
                  </td>
                </tr>
              ) : (
                sortedTrades.map(t => (
                  <tr key={t.id} className={`transition-colors ${theme === 'light' ? 'hover:bg-slate-100 text-slate-900 border-b border-slate-200' : 'hover:bg-dark-800/30'}`}>
                    <td className={`py-3 px-3 text-[11px] ${theme === 'light' ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
                      {new Date(t.entry_time).toLocaleDateString()} {new Date(t.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className={`py-3 px-3 font-bold ${theme === 'light' ? 'text-slate-900' : 'text-slate-200'}`}>
                      {t.instrument}
                      <span className={`ml-1 text-[10px] block font-normal ${theme === 'light' ? 'text-slate-600' : 'text-slate-500'}`}>{t.strategy_tag}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${t.direction === 'long'
                          ? (theme === 'light' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-emerald-950 text-emerald-400 border border-emerald-800')
                          : (theme === 'light' ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-rose-950 text-rose-400 border border-rose-800')
                        }`}>
                        {t.direction}
                      </span>
                    </td>
                    <td className={`py-3 px-3 ${theme === 'light' ? 'text-slate-800 font-semibold' : 'text-slate-300'}`}>
                      <div>${t.entry_price}</div>
                      {t.exit_price != null && <div className={`text-[10px] ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Exit: ${t.exit_price}</div>}
                    </td>
                    <td className="py-3 px-3 font-bold">
                      <div className={(t.calculatedPnl || 0) >= 0 ? (theme === 'light' ? 'text-emerald-700' : 'text-emerald-400') : (theme === 'light' ? 'text-rose-700' : 'text-rose-400')}>
                        {(t.calculatedPnl || 0) >= 0 ? '+' : ''}${t.calculatedPnl?.toFixed(2)}
                      </div>
                      <div className={`text-[10px] font-normal ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
                        {(t.calculatedPnlPercent || 0) >= 0 ? '+' : ''}{t.calculatedPnlPercent?.toFixed(2)}%
                      </div>
                    </td>
                    <td className={`py-3 px-3 font-bold ${theme === 'light' ? 'text-amber-700' : 'text-amber-400'}`}>
                      {t.riskRewardRatio} R
                    </td>
                    <td className="py-3 px-3 font-mono">
                      {t.voting_mode ? (
                        <div className="text-[10px]">
                          <span className={`font-bold block ${theme === 'light' ? 'text-blue-700' : 'text-cyan-400'}`}>{t.voting_mode}</span>
                          <span className={theme === 'light' ? 'text-slate-600 font-medium' : 'text-slate-400'}>{t.vote_tally || 'Tally recorded'}</span>
                        </div>
                      ) : (
                        <span className={`text-[10px] ${theme === 'light' ? 'text-slate-500 font-medium' : 'text-slate-500'}`}>Manual Entry</span>
                      )}
                    </td>
                    <td className="py-3 px-3 max-w-xs">
                      {t.win_reason ? (
                        <div className={`text-[11px] flex items-start gap-1 font-medium ${theme === 'light' ? 'text-emerald-800' : 'text-emerald-400'}`}>
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-600" />
                          <span>{t.win_reason}</span>
                        </div>
                      ) : t.loss_reason ? (
                        <div className={`text-[11px] flex items-start gap-1 font-medium ${theme === 'light' ? 'text-rose-800' : 'text-rose-400'}`}>
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-600" />
                          <span>{t.loss_reason}</span>
                        </div>
                      ) : (
                        <span className={`text-[11px] italic ${theme === 'light' ? 'text-slate-500' : 'text-slate-500'}`}>{t.reasoning || 'No reflection logged'}</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(t)}
                          className={`p-1 rounded transition-colors ${theme === 'light' ? 'hover:bg-slate-200 text-slate-600 hover:text-slate-900' : 'hover:bg-dark-700 text-slate-400 hover:text-white'}`}
                          title="Edit Trade / Reflections"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => t.id && handleDelete(t.id)}
                          className={`p-1 rounded transition-colors ${theme === 'light' ? 'hover:bg-rose-100 text-slate-500 hover:text-rose-700' : 'hover:bg-rose-900/50 text-slate-400 hover:text-rose-400'}`}
                          title="Delete Trade Entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log / Edit Trade Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm font-mono overflow-y-auto">
          <div className={`terminal-card max-w-2xl w-full p-6 border rounded-lg shadow-2xl relative my-8 ${theme === 'light' ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-700'
            }`}>
            <button
              onClick={() => setIsFormOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className={`text-base font-bold mb-4 flex items-center gap-2 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
              <BookOpen className="w-5 h-5 text-blue-500" />
              {editingTradeId ? 'EDIT TRADE & REFLECTION RECORD' : 'LOG NEW TRADE ENTRY'}
            </h3>

            {formError && (
              <div className="mb-4 p-3 rounded bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">INSTRUMENT SYMBOL *</label>
                  <input
                    type="text"
                    placeholder="e.g. RELIANCE.NS, BTC-USD"
                    value={instrument}
                    onChange={e => setInstrument(e.target.value)}
                    className="terminal-input w-full uppercase"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">DIRECTION *</label>
                  <select
                    value={direction}
                    onChange={e => setDirection(e.target.value as 'long' | 'short')}
                    className="terminal-input w-full"
                  >
                    <option value="long">LONG (BUY)</option>
                    <option value="short">SHORT (SELL)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">ENTRY PRICE ($ / ₹) *</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 1311.00"
                    value={entryPrice}
                    onChange={e => setEntryPrice(e.target.value)}
                    className="terminal-input w-full"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">POSITION SIZE (UNITS) *</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 10"
                    value={positionSize}
                    onChange={e => setPositionSize(e.target.value)}
                    className="terminal-input w-full"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">STOP LOSS PRICE</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Planned Risk"
                    value={stopLoss}
                    onChange={e => setStopLoss(e.target.value)}
                    className="terminal-input w-full"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">TARGET / EXIT PRICE</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Planned Target or Actual Exit"
                    value={target}
                    onChange={e => setTarget(e.target.value)}
                    className="terminal-input w-full"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">ACTUAL EXIT PRICE (IF CLOSED)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Actual Exit Price"
                    value={exitPrice}
                    onChange={e => setExitPrice(e.target.value)}
                    className="terminal-input w-full"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">STRATEGY TAG</label>
                  <input
                    type="text"
                    placeholder="Breakout, Trend, Scalp, Reversal"
                    value={strategyTag}
                    onChange={e => setStrategyTag(e.target.value)}
                    className="terminal-input w-full"
                  />
                </div>
              </div>

              {/* Active Strategy Consensus Telemetry */}
              <div className="p-3 rounded bg-cyan-950/30 border border-cyan-800/40 text-xs">
                <span className="font-bold text-cyan-400 block mb-1">STRATEGY VOTING PANEL TELEMETRY (AT ENTRY TIME)</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 text-[10px]">VOTING MODE</label>
                    <input
                      type="text"
                      placeholder="e.g. Day Trading"
                      value={votingMode}
                      onChange={e => setVotingMode(e.target.value)}
                      className="terminal-input w-full text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[10px]">VOTE TALLY SUMMARY</label>
                    <input
                      type="text"
                      placeholder="e.g. 4 Buy / 1 Sell"
                      value={voteTally}
                      onChange={e => setVoteTally(e.target.value)}
                      className="terminal-input w-full text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Reflection Sections */}
              <div className="pt-2 border-t border-dark-800 space-y-3">
                <div>
                  <label className="block font-bold text-emerald-400 mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    WHY I WON (Winning Drivers & Execution)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="What went right? Perfect entry trigger, catalyst news, disciplined risk management?"
                    value={winReason}
                    onChange={e => setWinReason(e.target.value)}
                    className="terminal-input w-full"
                  />
                </div>

                <div>
                  <label className="block font-bold text-rose-400 mb-1 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    WHY I LOST (Loss Post-Mortem & Mistakes)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Why did you lose? Early entry, FOMO, improper stop placement, market reversal?"
                    value={lossReason}
                    onChange={e => setLossReason(e.target.value)}
                    className="terminal-input w-full"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">GENERAL NOTES & REASONING</label>
                  <textarea
                    rows={2}
                    placeholder="Chart pattern setup, support/resistance levels..."
                    value={reasoning}
                    onChange={e => setReasoning(e.target.value)}
                    className="terminal-input w-full"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-dark-800">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded bg-dark-800 hover:bg-dark-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded font-bold shadow transition-all ${theme === 'light' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-600 text-white hover:bg-blue-500'
                    }`}
                >
                  {editingTradeId ? 'Save Reflection Changes' : 'Log Trade Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
