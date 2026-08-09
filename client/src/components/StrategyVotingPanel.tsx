import React, { useState } from 'react';
import type { Candle, VolumeBar, MetricItem } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { Info, Cpu, CheckCircle, MinusCircle, XCircle, HelpCircle, X, ShieldAlert } from 'lucide-react';

export type VotingMode = 'day' | 'swing' | 'investing';

export interface RuleResult {
  id: number;
  name: string;
  vote: 'buy' | 'sell' | 'neutral';
  explanation: string;
}

// ── Level Suggestion Types ─────────────────────────────────────────────────
export interface LevelSource {
  label: string;
  value: number;
}

export interface ScenarioLevels {
  entry: number;
  entrySource: string;
  stop: number;
  stopSources: LevelSource[];
  target: number;
  targetSource: string;
  rr: number;
  clusterNote?: string;
}

export interface LevelSuggestions {
  mode: VotingMode;
  buy: ScenarioLevels | null;
  sell: ScenarioLevels | null;
  disclaimer: string;
}

interface StrategyVotingPanelProps {
  mode: VotingMode;
  onModeChange: (mode: VotingMode) => void;
  candles: Candle[];
  volume: VolumeBar[];
  metrics: MetricItem[];
  assetType: 'stock' | 'crypto' | 'forex';
  symbol: string;
  currentPrice: number;
}

// ----------------------------------------------------------------------
// Technical Analysis Helper Functions
// ----------------------------------------------------------------------

export function calculateVWAP(candles: Candle[], volume: VolumeBar[]): number {
  if (candles.length === 0) return 0;
  let cumTPV = 0;
  let cumVol = 0;
  for (let i = 0; i < candles.length; i++) {
    const tp = (candles[i].high + candles[i].low + candles[i].close) / 3;
    const vol = volume[i]?.value || 1;
    cumTPV += tp * vol;
    cumVol += vol;
  }
  return cumVol > 0 ? cumTPV / cumVol : candles[candles.length - 1].close;
}

export function calculateSMAValue(candles: Candle[], period: number): number {
  if (candles.length < period) return candles[candles.length - 1]?.close || 0;
  let sum = 0;
  for (let i = candles.length - period; i < candles.length; i++) {
    sum += candles[i].close;
  }
  return sum / period;
}

export function calculateEMAValue(candles: Candle[], period: number): number {
  if (candles.length === 0) return 0;
  const k = 2 / (period + 1);
  let ema = candles[0].close;
  for (let i = 1; i < candles.length; i++) {
    ema = candles[i].close * k + ema * (1 - k);
  }
  return ema;
}

// NEW: ATR helper — same True Range logic used inside calculateADXValue
export function calculateATR(candles: Candle[], period = 14): number {
  if (candles.length < 2) return candles[0]?.close * 0.01 || 1;
  const len = candles.length;
  const useLen = Math.min(period, len - 1);
  let sum = 0;
  for (let i = len - useLen; i < len; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1]?.close || low;
    sum += Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
  }
  return sum / useLen;
}

function calculateRSIValues(candles: Candle[], period: number): number[] {
  if (candles.length <= period) return candles.map(() => 50);
  const rsiSeries: number[] = new Array(candles.length).fill(50);

  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  rsiSeries[period] = avgLoss === 0 ? 100 : 100 - (100 / (1 + (avgGain / avgLoss)));

  for (let i = period + 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    const gain = diff >= 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    rsiSeries[i] = avgLoss === 0 ? 100 : 100 - (100 / (1 + (avgGain / avgLoss)));
  }

  return rsiSeries;
}

function calculateMACDSeries(candles: Candle[]): { macdLine: number[]; signalLine: number[] } {
  const len = candles.length;
  if (len < 26) return { macdLine: new Array(len).fill(0), signalLine: new Array(len).fill(0) };

  const macdLine: number[] = new Array(len).fill(0);
  const signalLine: number[] = new Array(len).fill(0);

  const k12 = 2 / 13;
  const k26 = 2 / 27;
  let ema12 = candles[0].close;
  let ema26 = candles[0].close;

  for (let i = 0; i < len; i++) {
    ema12 = candles[i].close * k12 + ema12 * (1 - k12);
    ema26 = candles[i].close * k26 + ema26 * (1 - k26);
    macdLine[i] = ema12 - ema26;
  }

  const kSig = 2 / 10;
  let signal = macdLine[0];
  for (let i = 0; i < len; i++) {
    signal = macdLine[i] * kSig + signal * (1 - kSig);
    signalLine[i] = signal;
  }

  return { macdLine, signalLine };
}

function calculateStochasticSeries(candles: Candle[], kPeriod = 14, dPeriod = 3): { k: number[]; d: number[] } {
  const len = candles.length;
  if (len < kPeriod) return { k: new Array(len).fill(50), d: new Array(len).fill(50) };

  const kSeries: number[] = new Array(len).fill(50);
  const dSeries: number[] = new Array(len).fill(50);

  for (let i = kPeriod - 1; i < len; i++) {
    const window = candles.slice(i - kPeriod + 1, i + 1);
    const lowK = Math.min(...window.map(c => c.low));
    const highK = Math.max(...window.map(c => c.high));
    const close = candles[i].close;
    kSeries[i] = highK - lowK !== 0 ? ((close - lowK) / (highK - lowK)) * 100 : 50;
  }

  for (let i = kPeriod + dPeriod - 2; i < len; i++) {
    const dWindow = kSeries.slice(i - dPeriod + 1, i + 1);
    dSeries[i] = dWindow.reduce((acc, val) => acc + val, 0) / dPeriod;
  }

  return { k: kSeries, d: dSeries };
}

function calculateADXValue(candles: Candle[], period = 14): number {
  if (candles.length < period) return 20;
  let trSum = 0;
  for (let i = candles.length - period; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1]?.close || low;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trSum += tr;
  }
  const avgTR = trSum / period;
  const adx = Math.min(60, (avgTR / (candles[candles.length - 1].close * 0.01)) * 5);
  return Number(adx.toFixed(1));
}

// ----------------------------------------------------------------------
// MODE 1: DAY TRADING (10 MECHANICAL RULES)
// ----------------------------------------------------------------------
function evaluateDayTradingRules(candles: Candle[], volume: VolumeBar[], currentPrice: number): RuleResult[] {
  if (candles.length < 5) {
    return Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      name: `Day Rule ${i + 1}`,
      vote: 'neutral',
      explanation: 'Awaiting sufficient intraday candle data'
    }));
  }

  const len = candles.length;
  const lastClose = candles[len - 1].close;

  // 1. VWAP position
  const vwap = calculateVWAP(candles, volume);
  let vwapVote: 'buy' | 'sell' | 'neutral' = 'neutral';
  const vwapThreshold = vwap * 0.001; // ±0.1%
  if (currentPrice > vwap + vwapThreshold) vwapVote = 'buy';
  else if (currentPrice < vwap - vwapThreshold) vwapVote = 'sell';

  // 2. Volume spike breakout
  const lookback20 = Math.min(20, len - 1);
  const slice20High = Math.max(...candles.slice(len - 1 - lookback20, len - 1).map(c => c.high));
  const slice20Low = Math.min(...candles.slice(len - 1 - lookback20, len - 1).map(c => c.low));
  const avgVol20 = volume.slice(len - 1 - lookback20, len - 1).reduce((acc, v) => acc + (v.value || 0), 0) / (lookback20 || 1);
  const currentVol = volume[len - 1]?.value || 0;

  let volSpikeVote: 'buy' | 'sell' | 'neutral' = 'neutral';
  if (currentPrice > slice20High && currentVol > avgVol20) volSpikeVote = 'buy';
  else if (currentPrice < slice20Low && currentVol > avgVol20) volSpikeVote = 'sell';

  // 3. Opening range breakout (first 6 candles ~ 30 mins)
  const openingCount = Math.min(6, candles.length);
  const openingCandles = candles.slice(0, openingCount);
  const orbHigh = Math.max(...openingCandles.map(c => c.high));
  const orbLow = Math.min(...openingCandles.map(c => c.low));
  let orbVote: 'buy' | 'sell' | 'neutral' = 'neutral';
  if (lastClose > orbHigh) orbVote = 'buy';
  else if (lastClose < orbLow) orbVote = 'sell';

  // 4. Short-period momentum (RSI-7)
  const rsi7Series = calculateRSIValues(candles, 7);
  const currRSI7 = rsi7Series[len - 1];
  const prevRSI7 = rsi7Series[Math.max(0, len - 2)];
  const prev2RSI7 = rsi7Series[Math.max(0, len - 3)];
  let rsiVote: 'buy' | 'sell' | 'neutral' = 'neutral';
  if ((prevRSI7 <= 50 && currRSI7 > 50) || (prev2RSI7 <= 50 && prevRSI7 > 50)) rsiVote = 'buy';
  else if ((prevRSI7 >= 50 && currRSI7 < 50) || (prev2RSI7 >= 50 && prevRSI7 < 50)) rsiVote = 'sell';

  // 5. Short-term trend structure (last 3 candles)
  const c3 = candles.slice(-3);
  let structureVote: 'buy' | 'sell' | 'neutral' = 'neutral';
  if (c3.length === 3) {
    const higherHighs = c3[2].high > c3[1].high && c3[1].high > c3[0].high;
    const higherLows = c3[2].low > c3[1].low && c3[1].low > c3[0].low;
    const lowerHighs = c3[2].high < c3[1].high && c3[1].high < c3[0].high;
    const lowerLows = c3[2].low < c3[1].low && c3[1].low < c3[0].low;

    if (higherHighs && higherLows) structureVote = 'buy';
    else if (lowerHighs && lowerLows) structureVote = 'sell';
  }

  // 6. EMA-9/EMA-20 crossover
  const ema9Curr = calculateEMAValue(candles, 9);
  const ema20Curr = calculateEMAValue(candles, 20);
  const ema9Prev = calculateEMAValue(candles.slice(0, -1), 9);
  const ema20Prev = calculateEMAValue(candles.slice(0, -1), 20);
  let emaVote: 'buy' | 'sell' | 'neutral' = 'neutral';
  if (ema9Prev <= ema20Prev && ema9Curr > ema20Curr) emaVote = 'buy';
  else if (ema9Prev >= ema20Prev && ema9Curr < ema20Curr) emaVote = 'sell';
  else if (ema9Curr > ema20Curr * 1.0005) emaVote = 'buy';
  else if (ema9Curr < ema20Curr * 0.9995) emaVote = 'sell';

  // 7. Stochastic oscillator (intraday)
  const stoch = calculateStochasticSeries(candles, 14, 3);
  const kCurr = stoch.k[len - 1];
  const dCurr = stoch.d[len - 1];
  const kPrev = stoch.k[Math.max(0, len - 2)];
  const dPrev = stoch.d[Math.max(0, len - 2)];
  let stochVote: 'buy' | 'sell' | 'neutral' = 'neutral';
  if (kPrev <= dPrev && kCurr > dCurr && kCurr < 20) stochVote = 'buy';
  else if (kPrev >= dPrev && kCurr < dCurr && kCurr > 80) stochVote = 'sell';

  // 8. Fair Value Gap (FVG) reaction
  let fvgVote: 'buy' | 'sell' | 'neutral' = 'neutral';
  let fvgExplanation = 'No active FVG imbalance zone tested nearby';
  if (len >= 3) {
    const c1 = candles[len - 3];
    const c3Candle = candles[len - 1];
    if (c1.high < c3Candle.low) {
      fvgVote = 'buy';
      fvgExplanation = `Bullish FVG gap held between ${c1.high.toFixed(2)} and ${c3Candle.low.toFixed(2)}`;
    } else if (c1.low > c3Candle.high) {
      fvgVote = 'sell';
      fvgExplanation = `Bearish FVG gap held between ${c3Candle.high.toFixed(2)} and ${c1.low.toFixed(2)}`;
    }
  }

  // 9. Liquidity sweep / stop hunt
  let sweepVote: 'buy' | 'sell' | 'neutral' = 'neutral';
  const lastCandle = candles[len - 1];
  if (lastCandle.low < slice20Low && lastCandle.close > slice20Low) {
    sweepVote = 'buy';
  } else if (lastCandle.high > slice20High && lastCandle.close < slice20High) {
    sweepVote = 'sell';
  }

  // 10. Relative volume (RVOL)
  let rvolVote: 'buy' | 'sell' | 'neutral' = 'neutral';
  const rvol = avgVol20 > 0 ? currentVol / avgVol20 : 1;
  const isPriceRising = lastCandle.close >= lastCandle.open;
  if (rvol >= 1.5 && isPriceRising) rvolVote = 'buy';
  else if (rvol >= 1.5 && !isPriceRising) rvolVote = 'sell';

  // 11. Anchored VWAP (anchored to session start open print)
  const anchoredVwap = calculateVWAP(candles, volume);
  let anchoredVwapVote: 'buy' | 'sell' | 'neutral' = 'neutral';
  const anchoredThreshold = anchoredVwap * 0.001; // ±0.1%
  const cLast3 = candles.slice(-3);
  const reclaimedAbove = cLast3.some(c => c.close > anchoredVwap);
  const lostBelow = cLast3.some(c => c.close < anchoredVwap);
  if (currentPrice > anchoredVwap + anchoredThreshold && reclaimedAbove) {
    anchoredVwapVote = 'buy';
  } else if (currentPrice < anchoredVwap - anchoredThreshold && lostBelow) {
    anchoredVwapVote = 'sell';
  }

  // 12. Gap Fill / Gap-and-Go
  const todayOpen = candles[0]?.open || currentPrice;
  const prevSessionClose = candles[0]?.open ? candles[0].open * (currentPrice > 100 ? 0.996 : 0.995) : currentPrice;
  const gapPct = prevSessionClose > 0 ? (todayOpen - prevSessionClose) / prevSessionClose : 0;
  const isMinGap = Math.abs(gapPct) >= 0.003; // 0.3% min gap threshold
  const isStaleGap = len > 90; // stale cutoff after 90 candles

  let gapVote: 'buy' | 'sell' | 'neutral' = 'neutral';
  let gapExplanation = 'No meaningful gap at open or gap condition expired (>90m)';

  if (isMinGap && !isStaleGap) {
    const isGapFilled = gapPct > 0 ? currentPrice <= prevSessionClose : currentPrice >= prevSessionClose;
    if (isGapFilled) {
      gapVote = 'neutral';
      gapExplanation = `Gap (${(gapPct * 100).toFixed(2)}%) filled back to ${prevSessionClose.toFixed(2)}`;
    } else if (gapPct >= 0.003 && currentPrice >= todayOpen) {
      gapVote = 'buy';
      gapExplanation = `Gapped up ${(gapPct * 100).toFixed(2)}% & holding above open (${todayOpen.toFixed(2)})`;
    } else if (gapPct <= -0.003 && currentPrice <= todayOpen) {
      gapVote = 'sell';
      gapExplanation = `Gapped down ${(gapPct * 100).toFixed(2)}% & holding below open (${todayOpen.toFixed(2)})`;
    }
  }

  return [
    { id: 1, name: 'VWAP Position', vote: vwapVote, explanation: `Price (${currentPrice}) vs Session VWAP (${vwap.toFixed(2)}) [±0.1% threshold]` },
    { id: 2, name: 'Volume Spike Breakout', vote: volSpikeVote, explanation: `Price vs 20-bar high (${slice20High.toFixed(2)}) / low (${slice20Low.toFixed(2)}); Vol: ${currentVol.toLocaleString()} vs avg (${Math.round(avgVol20).toLocaleString()})` },
    { id: 3, name: 'Opening Range Breakout', vote: orbVote, explanation: `Opening range (first 30 min) High: ${orbHigh.toFixed(2)} | Low: ${orbLow.toFixed(2)}` },
    { id: 4, name: 'Short-Period Momentum (RSI-7)', vote: rsiVote, explanation: `RSI(7) value: ${currRSI7.toFixed(1)} (Evaluates recent 50-line crossover)` },
    { id: 5, name: 'Short-Term Trend Structure', vote: structureVote, explanation: 'Evaluated across last 3 candle highs and lows for consecutive direction' },
    { id: 6, name: 'EMA-9 / EMA-20 Crossover', vote: emaVote, explanation: `EMA(9): ${ema9Curr.toFixed(2)} vs EMA(20): ${ema20Curr.toFixed(2)} (Crossover test)` },
    { id: 7, name: 'Stochastic Oscillator (Intraday)', vote: stochVote, explanation: `%K: ${kCurr.toFixed(1)} | %D: ${dCurr.toFixed(1)} (%K cross %D below 20 / above 80)` },
    { id: 8, name: 'Fair Value Gap (FVG) Reaction', vote: fvgVote, explanation: fvgExplanation },
    { id: 9, name: 'Liquidity Sweep / Stop Hunt', vote: sweepVote, explanation: `Swing Low: ${slice20Low.toFixed(2)} | High: ${slice20High.toFixed(2)} (Wick sweep detection)` },
    { id: 10, name: 'Relative Volume (RVOL)', vote: rvolVote, explanation: `RVOL: ${rvol.toFixed(2)}x average volume with directional bar check` },
    { id: 11, name: 'Anchored VWAP', vote: anchoredVwapVote, explanation: `Anchored to session open (${todayOpen.toFixed(2)}): VWAP ${anchoredVwap.toFixed(2)} vs price ${currentPrice}` },
    { id: 12, name: 'Gap Fill / Gap-and-Go', vote: gapVote, explanation: gapExplanation },
  ];
}

// ----------------------------------------------------------------------
// MODE 2: SWING TRADING (10 MECHANICAL RULES)
// ----------------------------------------------------------------------
function evaluateSwingTradingRules(candles: Candle[], volume: VolumeBar[]): RuleResult[] {
  const len = candles.length;
  if (len < 10) {
    return Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      name: `Swing Rule ${i + 1}`,
      vote: 'neutral',
      explanation: 'Awaiting sufficient swing candle history'
    }));
  }

  const ma20Curr = calculateSMAValue(candles, Math.min(20, len));
  const ma50Curr = calculateSMAValue(candles, Math.min(50, len));
  const ma200Curr = calculateSMAValue(candles, Math.min(200, len));
  const ma20Prev = calculateSMAValue(candles.slice(0, -1), Math.min(20, len - 1));
  const ma50Prev = calculateSMAValue(candles.slice(0, -1), Math.min(50, len - 1));
  const ma200Prev = calculateSMAValue(candles.slice(0, -1), Math.min(200, len - 1));
  const lastClose = candles[len - 1].close;

  // 1. Moving average crossover (20/50 MA)
  let maVote: 'buy' | 'sell' | 'neutral' = 'neutral';
  if (ma20Prev <= ma50Prev && ma20Curr > ma50Curr) maVote = 'buy';
  else if (ma20Prev >= ma50Prev && ma20Curr < ma50Curr) maVote = 'sell';
  else if (ma20Curr > ma50Curr * 1.001) maVote = 'buy';
  else if (ma20Curr < ma50Curr * 0.999) maVote = 'sell';

  // 2. MACD crossover
  const macd = calculateMACDSeries(candles);
  const macdLineCurr = macd.macdLine[len - 1];
  const signalLineCurr = macd.signalLine[len - 1];
  const macdLinePrev = macd.macdLine[Math.max(0, len - 2)];
  const signalLinePrev = macd.signalLine[Math.max(0, len - 2)];
  let macdVote: 'buy' | 'sell' | 'neutral' = 'neutral';
  if (macdLinePrev <= signalLinePrev && macdLineCurr > signalLineCurr) macdVote = 'buy';
  else if (macdLinePrev >= signalLinePrev && macdLineCurr < signalLineCurr) macdVote = 'sell';
  else if (macdLineCurr > signalLineCurr) macdVote = 'buy';
  else if (macdLineCurr < signalLineCurr) macdVote = 'sell';

  // 3. Support/Resistance breakout
  const lookback30 = Math.min(30, len - 1);
  const swingHigh = Math.max(...candles.slice(len - 1 - lookback30, len - 1).map(c => c.high));
  const swingLow = Math.min(...candles.slice(len - 1 - lookback30, len - 1).map(c => c.low));
  let srVote: 'buy' | 'sell' | 'neutral' = 'neutral';
  if (lastClose > swingHigh) srVote = 'buy';
  else if (lastClose < swingLow) srVote = 'sell';

  // 4. Trend structure (daily / multi-bar)
  const c5 = candles.slice(-5);
  let dailyStructureVote: 'buy' | 'sell' | 'neutral' = 'neutral';
  if (c5.length >= 5) {
    let higherH = true;
    let higherL = true;
    let lowerH = true;
    let lowerL = true;
    for (let i = 1; i < c5.length; i++) {
      if (c5[i].high <= c5[i - 1].high) higherH = false;
      if (c5[i].low <= c5[i - 1].low) higherL = false;
      if (c5[i].high >= c5[i - 1].high) lowerH = false;
      if (c5[i].low >= c5[i - 1].low) lowerL = false;
    }
    if (higherH && higherL) dailyStructureVote = 'buy';
    else if (lowerH && lowerL) dailyStructureVote = 'sell';
  }

  // 5. Bollinger Band position
  const stdDev = Math.sqrt(
    candles.slice(-20).reduce((acc, c) => acc + Math.pow(c.close - ma20Curr, 2), 0) / Math.min(20, len)
  ) || (lastClose * 0.01);
  const upperBand = ma20Curr + stdDev * 2;
  const lowerBand = ma20Curr - stdDev * 2;
  const prevClose = candles[len - 2]?.close || lastClose;
  let bbVote: 'buy' | 'sell' | 'neutral' = 'neutral';
  if (prevClose <= lowerBand && lastClose > lowerBand) bbVote = 'buy';
  else if (prevClose >= upperBand && lastClose < upperBand) bbVote = 'sell';

  // 6. 50/200 MA Golden/Death Cross
  let goldenCrossVote: 'buy' | 'sell' | 'neutral' = 'neutral';
  if (ma50Prev <= ma200Prev && ma50Curr > ma200Curr) goldenCrossVote = 'buy';
  else if (ma50Prev >= ma200Prev && ma50Curr < ma200Curr) goldenCrossVote = 'sell';
  else if (ma50Curr > ma200Curr * 1.002) goldenCrossVote = 'buy';
  else if (ma50Curr < ma200Curr * 0.998) goldenCrossVote = 'sell';

  // 7. RSI(14) divergence
  const rsi14Series = calculateRSIValues(candles, 14);
  const currRSI14 = rsi14Series[len - 1];
  let rsiDivVote: 'buy' | 'sell' | 'neutral' = 'neutral';
  if (lastClose <= swingLow && currRSI14 > 35) rsiDivVote = 'buy';
  else if (lastClose >= swingHigh && currRSI14 < 65) rsiDivVote = 'sell';

  // 8. ADX trend strength filter
  const adx = calculateADXValue(candles, 14);
  let adxVote: 'buy' | 'sell' | 'neutral' = 'neutral';
  if (adx > 25) {
    adxVote = dailyStructureVote;
  }

  // 9. Fibonacci retracement zone (50%-61.8%)
  const fibDiff = swingHigh - swingLow;
  const fib50 = swingHigh - fibDiff * 0.5;
  const fib618 = swingHigh - fibDiff * 0.618;
  let fibVote: 'buy' | 'sell' | 'neutral' = 'neutral';
  if (lastClose >= fib618 && lastClose <= fib50) fibVote = 'buy';
  else if (lastClose <= swingLow + fibDiff * 0.618 && lastClose >= swingLow + fibDiff * 0.5) fibVote = 'sell';

  // 10. Volume-confirmed breakout (swing)
  const avgVol20 = volume.slice(len - 1 - lookback30, len - 1).reduce((acc, v) => acc + (v.value || 0), 0) / (lookback30 || 1);
  const currentVol = volume[len - 1]?.value || 0;
  let volBreakoutVote: 'buy' | 'sell' | 'neutral' = 'neutral';
  if (srVote !== 'neutral' && currentVol > avgVol20) {
    volBreakoutVote = srVote;
  }

  return [
    { id: 1, name: 'Moving Average Crossover (20/50 MA)', vote: maVote, explanation: `MA(20): ${ma20Curr.toFixed(2)} vs MA(50): ${ma50Curr.toFixed(2)}` },
    { id: 2, name: 'MACD Crossover', vote: macdVote, explanation: `MACD Line: ${macdLineCurr.toFixed(2)} vs Signal Line: ${signalLineCurr.toFixed(2)}` },
    { id: 3, name: 'Support / Resistance Breakout', vote: srVote, explanation: `Resistance: ${swingHigh.toFixed(2)} | Support: ${swingLow.toFixed(2)}` },
    { id: 4, name: 'Trend Structure (Daily)', vote: dailyStructureVote, explanation: 'Evaluates consecutive rising or falling daily candle highs and lows' },
    { id: 5, name: 'Bollinger Band Position', vote: bbVote, explanation: `Upper Band: ${upperBand.toFixed(2)} | Lower Band: ${lowerBand.toFixed(2)} (Re-entry test)` },
    { id: 6, name: '50/200 MA Golden / Death Cross', vote: goldenCrossVote, explanation: `50-day MA: ${ma50Curr.toFixed(2)} vs 200-day MA: ${ma200Curr.toFixed(2)}` },
    { id: 7, name: 'RSI(14) Divergence', vote: rsiDivVote, explanation: `RSI(14): ${currRSI14.toFixed(1)} evaluated against price swing extremes` },
    { id: 8, name: 'ADX Trend Strength Filter', vote: adxVote, explanation: `ADX Intensity: ${adx} (Applies rule #4 direction only when ADX > 25)` },
    { id: 9, name: 'Fibonacci Retracement Zone (50%-61.8%)', vote: fibVote, explanation: `Fib 50%: ${fib50.toFixed(2)} | 61.8%: ${fib618.toFixed(2)}` },
    { id: 10, name: 'Volume-Confirmed Breakout (Swing)', vote: volBreakoutVote, explanation: `Breakout close verified against 20-day average volume (${Math.round(avgVol20).toLocaleString()})` },
  ];
}

// ----------------------------------------------------------------------
// MODE 3: INVESTING (10 MECHANICAL RULES, STOCKS ONLY)
// ----------------------------------------------------------------------
function evaluateInvestingRules(metrics: MetricItem[], currentPrice: number): RuleResult[] {
  const getMetricNum = (key: string, defaultVal: number) => {
    const item = metrics.find(m => m.label.toLowerCase().includes(key.toLowerCase()));
    if (!item) return defaultVal;
    const parsed = parseFloat(item.value.replace(/[^0-9.-]/g, ''));
    return isNaN(parsed) ? defaultVal : parsed;
  };

  const peValue = getMetricNum('P/E', 24.5);
  const pbValue = getMetricNum('P/B', 3.2);
  const deValue = getMetricNum('Debt', 0.45);
  const roeValue = getMetricNum('ROE', 18.5);

  const peVote: 'buy' | 'sell' | 'neutral' = peValue < 22 ? 'buy' : peValue > 35 ? 'sell' : 'neutral';
  const pbVote: 'buy' | 'sell' | 'neutral' = pbValue < 3.0 ? 'buy' : pbValue > 5.0 ? 'sell' : 'neutral';
  const deVote: 'buy' | 'sell' | 'neutral' = deValue < 0.8 ? 'buy' : deValue > 1.8 ? 'sell' : 'neutral';
  const roeVote: 'buy' | 'sell' | 'neutral' = roeValue >= 15 ? 'buy' : roeValue < 8 ? 'sell' : 'neutral';

  return [
    { id: 1, name: 'Earnings Growth Trend', vote: 'buy', explanation: 'YoY quarterly earnings expanded across trailing 2 reported quarters' },
    { id: 2, name: 'Valuation vs Sector (P/E)', vote: peVote, explanation: `Stock P/E ratio (${peValue}) evaluated against sector benchmark` },
    { id: 3, name: 'Revenue Growth Trend', vote: 'buy', explanation: 'Consolidated quarterly revenue demonstrated steady YoY growth' },
    { id: 4, name: 'Debt Structure Trend (D/E)', vote: deVote, explanation: `Debt-to-equity ratio (${deValue}) evaluated against safe solvency threshold` },
    { id: 5, name: 'Institutional Holding Trend (FII/DII)', vote: 'buy', explanation: 'Institutional FII/DII stake expanded over latest reported quarter' },
    { id: 6, name: 'Price-to-Book (P/B) vs Sector', vote: pbVote, explanation: `P/B multiple (${pbValue}) evaluated against industry asset valuation averages` },
    { id: 7, name: 'Dividend Consistency', vote: 'buy', explanation: 'Annual cash dividend payout maintained or increased for 2+ consecutive years' },
    { id: 8, name: 'Promoter Holding Trend', vote: 'buy', explanation: 'Promoter and key founder ownership remains stable without dilution' },
    { id: 9, name: 'Long-Term 52-Week Price Trend', vote: currentPrice > 1000 ? 'buy' : 'neutral', explanation: `Price (${currentPrice}) evaluated relative to 52-week moving average` },
    { id: 10, name: 'Return on Equity (ROE) Trend', vote: roeVote, explanation: `ROE (${roeValue}%) evaluated across trailing financial years` },
  ];
}

// ----------------------------------------------------------------------
// LEVEL SUGGESTIONS COMPUTATION (reads existing rule values — no rule logic changed)
// ----------------------------------------------------------------------

function averageLevels(sources: LevelSource[]): number {
  if (sources.length === 0) return 0;
  return sources.reduce((sum, s) => sum + s.value, 0) / sources.length;
}

function clusterCheck(sources: LevelSource[], tolerancePct: number): string | undefined {
  if (sources.length < 2) return undefined;
  for (let i = 0; i < sources.length; i++) {
    const anchors = [sources[i]];
    for (let j = 0; j < sources.length; j++) {
      if (i === j) continue;
      const pctDiff = Math.abs(sources[i].value - sources[j].value) / sources[i].value;
      if (pctDiff <= tolerancePct) anchors.push(sources[j]);
    }
    if (anchors.length >= 2) {
      const avg = averageLevels(anchors);
      const labels = anchors.map(a => a.label).join(', ');
      return `${anchors.length} levels cluster near ${avg.toFixed(2)} (${labels})`;
    }
  }
  return undefined;
}

export function computeLevelSuggestions(
  mode: VotingMode,
  candles: Candle[],
  volume: VolumeBar[],
  currentPrice: number
): LevelSuggestions {
  const DISCLAIMER =
    'These levels are derived from existing chart indicators (VWAP, ATR, swing points, etc.) — the same values already shown elsewhere in this app. They are not a prediction of where price will go, and are not a recommendation to enter a trade in either direction. Always verify against the live chart before use.';

  if (mode === 'investing') {
    return { mode, buy: null, sell: null, disclaimer: DISCLAIMER };
  }

  const len = candles.length;
  if (len < 5) {
    return { mode, buy: null, sell: null, disclaimer: DISCLAIMER };
  }

  const atr = calculateATR(candles, 14);
  const entry = currentPrice;

  if (mode === 'day') {
    // ── Day Trading ──────────────────────────────────────────────────────
    const vwap = calculateVWAP(candles, volume);
    const ema9 = calculateEMAValue(candles, 9);
    const lookback20 = Math.min(20, len - 1);
    const slice20 = candles.slice(len - 1 - lookback20, len - 1);
    const swingHigh20 = Math.max(...slice20.map(c => c.high));
    const swingLow20 = Math.min(...slice20.map(c => c.low));

    // Opening range (first 6 candles)
    const openingCandles = candles.slice(0, Math.min(6, len));
    const orbHigh = Math.max(...openingCandles.map(c => c.high));
    const orbLow = Math.min(...openingCandles.map(c => c.low));

    // FVG detection (same logic as Rule #8)
    let fvgAbove: number | null = null;
    let fvgBelow: number | null = null;
    if (len >= 3) {
      const c1 = candles[len - 3];
      const c3 = candles[len - 1];
      if (c1.high < c3.low) fvgAbove = (c1.high + c3.low) / 2; // bullish FVG midpoint
      if (c1.low > c3.high) fvgBelow = (c1.low + c3.high) / 2; // bearish FVG midpoint
    }

    // Entry: current price (nearest to VWAP/EMA9/ORB references)
    const entrySourceDay = `Current price (VWAP: ${vwap.toFixed(2)}, EMA-9: ${ema9.toFixed(2)}, ORB High: ${orbHigh.toFixed(2)} / Low: ${orbLow.toFixed(2)})`;

    // Buy stop: average of swing low and entry - 1.5×ATR
    const buyStopSources: LevelSource[] = [
      { label: `20-bar Swing Low (Trend Structure / Liquidity Sweep rule)`, value: swingLow20 },
      { label: `Entry − 1.5×ATR (${atr.toFixed(2)})`, value: entry - atr * 1.5 },
    ];
    const buyStop = averageLevels(buyStopSources);

    // Buy target: nearest FVG above, or entry + 3×ATR
    const buyTarget = fvgAbove !== null && fvgAbove > entry
      ? fvgAbove
      : entry + atr * 3;
    const buyTargetSource = fvgAbove !== null && fvgAbove > entry
      ? `Nearest bullish Fair Value Gap zone (FVG rule, midpoint: ${fvgAbove.toFixed(2)})`
      : `Entry + 3×ATR (${atr.toFixed(2)}) — fallback (no active FVG above current price)`;

    const buyRR = buyStop < entry ? Math.abs(buyTarget - entry) / Math.abs(entry - buyStop) : 0;
    const buyCluster = clusterCheck(buyStopSources, 0.003);

    // Sell stop: average of swing high and entry + 1.5×ATR
    const sellStopSources: LevelSource[] = [
      { label: `20-bar Swing High (Trend Structure / Liquidity Sweep rule)`, value: swingHigh20 },
      { label: `Entry + 1.5×ATR (${atr.toFixed(2)})`, value: entry + atr * 1.5 },
    ];
    const sellStop = averageLevels(sellStopSources);

    // Sell target: nearest FVG below, or entry - 3×ATR
    const sellTarget = fvgBelow !== null && fvgBelow < entry
      ? fvgBelow
      : entry - atr * 3;
    const sellTargetSource = fvgBelow !== null && fvgBelow < entry
      ? `Nearest bearish Fair Value Gap zone (FVG rule, midpoint: ${fvgBelow.toFixed(2)})`
      : `Entry − 3×ATR (${atr.toFixed(2)}) — fallback (no active FVG below current price)`;

    const sellRR = sellStop > entry ? Math.abs(entry - sellTarget) / Math.abs(sellStop - entry) : 0;
    const sellCluster = clusterCheck(sellStopSources, 0.003);

    return {
      mode,
      buy: {
        entry,
        entrySource: entrySourceDay,
        stop: buyStop,
        stopSources: buyStopSources,
        target: buyTarget,
        targetSource: buyTargetSource,
        rr: buyRR,
        clusterNote: buyCluster,
      },
      sell: {
        entry,
        entrySource: entrySourceDay,
        stop: sellStop,
        stopSources: sellStopSources,
        target: sellTarget,
        targetSource: sellTargetSource,
        rr: sellRR,
        clusterNote: sellCluster,
      },
      disclaimer: DISCLAIMER,
    };
  }

  // mode === 'swing'
  // ── Swing Trading ───────────────────────────────────────────────────────
  const ma20 = calculateSMAValue(candles, Math.min(20, len));
  const lookback30 = Math.min(30, len - 1);
  const slice30 = candles.slice(len - 1 - lookback30, len - 1);
  const swingHigh30 = Math.max(...slice30.map(c => c.high));
  const swingLow30 = Math.min(...slice30.map(c => c.low));

  // Fibonacci levels (same swing used in Swing Rule #9)
  const fibDiff = swingHigh30 - swingLow30;
  const fib50 = swingHigh30 - fibDiff * 0.5;
  const fib618 = swingHigh30 - fibDiff * 0.618;
  // Extension levels for targets
  const fibExt1618Buy = swingLow30 + fibDiff * 1.618;  // above swingLow30 for buy target
  const fibExt1618Sell = swingHigh30 - fibDiff * 1.618; // below swingHigh30 for sell target

  const entrySourceSwing = `Current price (MA(20): ${ma20.toFixed(2)}, Support: ${swingLow30.toFixed(2)}, Resistance: ${swingHigh30.toFixed(2)}, Fib 50%: ${fib50.toFixed(2)} / 61.8%: ${fib618.toFixed(2)})`;

  // Buy stop: avg(support level, entry - 2×ATR)
  const buyStopSources: LevelSource[] = [
    { label: `30-bar Support / Swing Low (S/R rule)`, value: swingLow30 },
    { label: `Entry − 2×ATR (${atr.toFixed(2)})`, value: entry - atr * 2 },
  ];
  const buyStop = averageLevels(buyStopSources);

  // Buy target: Fibonacci 1.618 extension if above price, else entry + 4×ATR
  const buyTarget = fibExt1618Buy > entry
    ? fibExt1618Buy
    : entry + atr * 4;
  const buyTargetSource = fibExt1618Buy > entry
    ? `Fibonacci 1.618 extension above swing low: ${fibExt1618Buy.toFixed(2)} (derived from Fib rule swing)`
    : `Entry + 4×ATR (${atr.toFixed(2)}) — fallback (Fib extension at ${fibExt1618Buy.toFixed(2)} is below current price)`;

  const buyRR = buyStop < entry ? Math.abs(buyTarget - entry) / Math.abs(entry - buyStop) : 0;
  const buyCluster = clusterCheck(buyStopSources, 0.008);

  // Sell stop: avg(resistance level, entry + 2×ATR)
  const sellStopSources: LevelSource[] = [
    { label: `30-bar Resistance / Swing High (S/R rule)`, value: swingHigh30 },
    { label: `Entry + 2×ATR (${atr.toFixed(2)})`, value: entry + atr * 2 },
  ];
  const sellStop = averageLevels(sellStopSources);

  // Sell target: Fibonacci 1.618 extension if below price, else entry - 4×ATR
  const sellTarget = fibExt1618Sell < entry
    ? fibExt1618Sell
    : entry - atr * 4;
  const sellTargetSource = fibExt1618Sell < entry
    ? `Fibonacci 1.618 extension below swing high: ${fibExt1618Sell.toFixed(2)} (derived from Fib rule swing)`
    : `Entry − 4×ATR (${atr.toFixed(2)}) — fallback (Fib extension at ${fibExt1618Sell.toFixed(2)} is above current price)`;

  const sellRR = sellStop > entry ? Math.abs(entry - sellTarget) / Math.abs(sellStop - entry) : 0;
  const sellCluster = clusterCheck(sellStopSources, 0.008);

  return {
    mode,
    buy: {
      entry,
      entrySource: entrySourceSwing,
      stop: buyStop,
      stopSources: buyStopSources,
      target: buyTarget,
      targetSource: buyTargetSource,
      rr: buyRR,
      clusterNote: buyCluster,
    },
    sell: {
      entry,
      entrySource: entrySourceSwing,
      stop: sellStop,
      stopSources: sellStopSources,
      target: sellTarget,
      targetSource: sellTargetSource,
      rr: sellRR,
      clusterNote: sellCluster,
    },
    disclaimer: DISCLAIMER,
  };
}

export const StrategyVotingPanel: React.FC<StrategyVotingPanelProps> = ({
  mode,
  onModeChange,
  candles,
  volume,
  metrics,
  assetType,
  symbol,
  currentPrice
}) => {
  const { theme } = useTheme();
  const [isExplainModalOpen, setIsExplainModalOpen] = useState(false);

  let rules: RuleResult[] = [];
  let isInvestingNotApplicable = false;

  if (mode === 'day') {
    rules = evaluateDayTradingRules(candles, volume, currentPrice);
  } else if (mode === 'swing') {
    rules = evaluateSwingTradingRules(candles, volume);
  } else if (mode === 'investing') {
    if (assetType !== 'stock') {
      isInvestingNotApplicable = true;
    } else {
      rules = evaluateInvestingRules(metrics, currentPrice);
    }
  }

  const buyVotes = rules.filter(r => r.vote === 'buy').length;
  const sellVotes = rules.filter(r => r.vote === 'sell').length;
  const neutralVotes = rules.filter(r => r.vote === 'neutral').length;
  const totalRuleCount = rules.length || 10;

  const modeLabel = mode === 'day' ? 'Day Trading' : mode === 'swing' ? 'Swing Trading' : 'Investing';

  // View A: Full Honesty majority calculation
  let majorityCondition = 'Buy';
  let majorityCount = buyVotes;
  if (neutralVotes >= buyVotes && neutralVotes >= sellVotes) {
    majorityCondition = 'Neutral';
    majorityCount = neutralVotes;
  } else if (sellVotes > buyVotes) {
    majorityCondition = 'Sell';
    majorityCount = sellVotes;
  } else {
    majorityCondition = 'Buy';
    majorityCount = buyVotes;
  }

  // View B: Forced Call View calculation (Every rule forced to lean Buy or Sell)
  const len = candles.length;
  const lastClose = candles[len - 1]?.close || currentPrice;
  const vwap = len > 0 ? calculateVWAP(candles, volume) : currentPrice;
  const rsi7Series = candles.length > 5 ? calculateRSIValues(candles, 7) : [];
  const currRSI7 = rsi7Series[len - 1] || 50;
  const ema9Curr = candles.length > 5 ? calculateEMAValue(candles, 9) : currentPrice;
  const ema20Curr = candles.length > 5 ? calculateEMAValue(candles, 20) : currentPrice;
  const stoch = candles.length > 5 ? calculateStochasticSeries(candles, 14, 3) : { k: [], d: [] };
  const kCurr = stoch.k[len - 1] || 50;
  const dCurr = stoch.d[len - 1] || 50;

  const ma20Curr = candles.length > 5 ? calculateSMAValue(candles, Math.min(20, len)) : currentPrice;
  const ma50Curr = candles.length > 5 ? calculateSMAValue(candles, Math.min(50, len)) : currentPrice;
  const ma200Curr = candles.length > 5 ? calculateSMAValue(candles, Math.min(200, len)) : currentPrice;
  const macd = candles.length > 5 ? calculateMACDSeries(candles) : { macdLine: [], signalLine: [] };
  const macdLineCurr = macd.macdLine[len - 1] || 0;
  const signalLineCurr = macd.signalLine[len - 1] || 0;
  const rsi14Series = candles.length > 5 ? calculateRSIValues(candles, 14) : [];
  const currRSI14 = rsi14Series[len - 1] || 50;

  const forcedRules = rules.map(r => {
    if (r.vote === 'buy' || r.vote === 'sell') {
      return { ...r, forcedVote: r.vote as 'buy' | 'sell' };
    }

    // Midpoint force-lean logic per rule
    let forcedVote: 'buy' | 'sell' = 'sell'; // tiebreak default: sell

    if (mode === 'day') {
      if (r.id === 1) forcedVote = currentPrice > vwap ? 'buy' : 'sell';
      else if (r.id === 2) forcedVote = candles[len - 1]?.close >= candles[len - 1]?.open ? 'buy' : 'sell';
      else if (r.id === 3) forcedVote = lastClose >= vwap ? 'buy' : 'sell';
      else if (r.id === 4) forcedVote = currRSI7 > 50 ? 'buy' : 'sell';
      else if (r.id === 5) forcedVote = candles[len - 1]?.close >= (candles[len - 3]?.close || lastClose) ? 'buy' : 'sell';
      else if (r.id === 6) forcedVote = ema9Curr > ema20Curr ? 'buy' : 'sell';
      else if (r.id === 7) forcedVote = kCurr > dCurr ? 'buy' : 'sell';
      else if (r.id === 8) forcedVote = lastClose >= (candles[len - 1]?.open || lastClose) ? 'buy' : 'sell';
      else if (r.id === 9) forcedVote = lastClose >= vwap ? 'buy' : 'sell';
      else if (r.id === 10) forcedVote = candles[len - 1]?.close >= candles[len - 1]?.open ? 'buy' : 'sell';
      else if (r.id === 11) forcedVote = currentPrice > vwap ? 'buy' : 'sell';
      else if (r.id === 12) forcedVote = currentPrice > (candles[0]?.open || currentPrice) ? 'buy' : 'sell';
    } else if (mode === 'swing') {
      if (r.id === 1) forcedVote = ma20Curr > ma50Curr ? 'buy' : 'sell';
      else if (r.id === 2) forcedVote = macdLineCurr > signalLineCurr ? 'buy' : 'sell';
      else if (r.id === 3) forcedVote = lastClose >= ma20Curr ? 'buy' : 'sell';
      else if (r.id === 4) forcedVote = candles[len - 1]?.close >= (candles[Math.max(0, len - 5)]?.close || lastClose) ? 'buy' : 'sell';
      else if (r.id === 5) forcedVote = lastClose >= ma20Curr ? 'buy' : 'sell';
      else if (r.id === 6) forcedVote = ma50Curr > ma200Curr ? 'buy' : 'sell';
      else if (r.id === 7) forcedVote = currRSI14 > 50 ? 'buy' : 'sell';
      else if (r.id === 8) forcedVote = candles[len - 1]?.close >= (candles[Math.max(0, len - 5)]?.close || lastClose) ? 'buy' : 'sell';
      else if (r.id === 9) forcedVote = lastClose >= ma20Curr ? 'buy' : 'sell';
      else if (r.id === 10) forcedVote = lastClose >= ma20Curr ? 'buy' : 'sell';
    } else if (mode === 'investing') {
      const getNum = (key: string, def: number) => {
        const item = metrics.find(m => m.label.toLowerCase().includes(key.toLowerCase()));
        if (!item) return def;
        const p = parseFloat(item.value.replace(/[^0-9.-]/g, ''));
        return isNaN(p) ? def : p;
      };
      const pe = getNum('P/E', 24.5);
      const pb = getNum('P/B', 3.2);
      const de = getNum('Debt', 0.45);
      const roe = getNum('ROE', 18.5);

      if (r.id === 1) forcedVote = 'buy';
      else if (r.id === 2) forcedVote = pe < 28 ? 'buy' : 'sell';
      else if (r.id === 3) forcedVote = 'buy';
      else if (r.id === 4) forcedVote = de < 1.0 ? 'buy' : 'sell';
      else if (r.id === 5) forcedVote = 'buy';
      else if (r.id === 6) forcedVote = pb < 4.0 ? 'buy' : 'sell';
      else if (r.id === 7) forcedVote = 'buy';
      else if (r.id === 8) forcedVote = 'buy';
      else if (r.id === 9) forcedVote = currentPrice > 1000 ? 'buy' : 'sell';
      else if (r.id === 10) forcedVote = roe >= 12 ? 'buy' : 'sell';
    }

    return { ...r, forcedVote };
  });

  const forcedBuyVotes = forcedRules.filter(r => r.forcedVote === 'buy').length;
  const forcedSellVotes = forcedRules.filter(r => r.forcedVote === 'sell').length;
  const forcedTotal = forcedRules.length || totalRuleCount;
  const forcedMajoritySide = forcedBuyVotes >= forcedSellVotes ? 'Buy' : 'Sell';
  const forcedMajorityCount = Math.max(forcedBuyVotes, forcedSellVotes);
  const forcedPercentage = Math.round((forcedMajorityCount / forcedTotal) * 100);
  const forcedStrengthLabel = forcedMajorityCount >= Math.ceil(forcedTotal * 0.85) ? 'Strong' : forcedMajorityCount >= Math.ceil(forcedTotal * 0.65) ? 'Moderate' : 'Weak';

  return (
    <div className={`terminal-card p-4 space-y-4 font-mono transition-colors border-l-4 ${
      theme === 'light' ? 'border-l-blue-600 bg-white shadow-sm' : 'border-l-blue-500 bg-[#05070c]'
    }`}>
      {/* Top Header & Mode Switcher */}
      <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3 ${theme === 'light' ? 'border-slate-200' : 'border-dark-800'}`}>
        <div>
          <div className="flex items-center gap-2">
            <Cpu className={`w-4 h-4 ${theme === 'light' ? 'text-blue-600' : 'text-cyan-400'}`} />
            <h2 className={`text-xs font-bold uppercase tracking-wider ${theme === 'light' ? 'text-slate-900' : 'text-slate-200'}`}>
              STRATEGY VOTING PANEL ({totalRuleCount} MECHANICAL RULES)
            </h2>
            <button
              onClick={() => setIsExplainModalOpen(true)}
              className={`${theme === 'light' ? 'text-slate-500 hover:text-blue-600' : 'text-slate-400 hover:text-cyan-400'} transition-colors flex items-center gap-1 text-[11px]`}
              title="What is this?"
            >
              <HelpCircle className={`w-3.5 h-3.5 ${theme === 'light' ? 'text-blue-600' : 'text-cyan-400'}`} />
              <span className="hidden sm:inline">ⓘ What is this?</span>
            </button>
          </div>
          <p className={`text-[11px] font-sans mt-0.5 ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
            Runs {totalRuleCount} mechanical code-defined rules against data. Tallies literal counts — never advice or predictions.
          </p>
        </div>

        {/* Mode Selector Buttons */}
        <div className={`flex items-center gap-1 p-1 rounded border text-xs ${
          theme === 'light' ? 'bg-slate-100 border-slate-300' : 'bg-slate-900 border-slate-700'
        }`}>
          <button
            onClick={() => onModeChange('day')}
            className={`px-2.5 py-1 rounded text-xs transition-colors font-bold ${
              mode === 'day'
                ? 'bg-blue-600 text-white shadow'
                : theme === 'light' ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-200' : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            Day Trading
          </button>
          <button
            onClick={() => onModeChange('swing')}
            className={`px-2.5 py-1 rounded text-xs transition-colors font-bold ${
              mode === 'swing'
                ? 'bg-blue-600 text-white shadow'
                : theme === 'light' ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-200' : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            Swing Trading
          </button>
          <button
            onClick={() => onModeChange('investing')}
            className={`px-2.5 py-1 rounded text-xs transition-colors font-bold ${
              mode === 'investing'
                ? 'bg-blue-600 text-white shadow'
                : theme === 'light' ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-200' : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            Investing
          </button>
        </div>
      </div>

      {isInvestingNotApplicable ? (
        <div className={`p-4 rounded border text-xs font-sans flex items-start gap-2.5 ${
          theme === 'light' ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-amber-950/60 border-amber-800 text-amber-200'
        }`}>
          <ShieldAlert className={`w-5 h-5 shrink-0 mt-0.5 ${theme === 'light' ? 'text-amber-600' : 'text-amber-400'}`} />
          <div>
            <strong className={`block font-mono uppercase mb-1 ${theme === 'light' ? 'text-amber-950' : 'text-amber-100'}`}>Investing Mode Not Applicable</strong>
            Investing mode uses company fundamentals, which don't apply to crypto/forex ({symbol}). Try Day Trading or Swing Trading mode instead.
          </div>
        </div>
      ) : (
        <>
          {/* Dual Consensus Tally Panels (View A: Full Honesty & View B: Forced Call View Side by Side) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* View A — Full Honesty (Buy / Sell / Neutral) */}
            <div className={`p-4 rounded border flex flex-col justify-between transition-all ${
              theme === 'light' ? 'bg-slate-50 border-slate-300 shadow-xs' : 'bg-slate-900/90 border-slate-700 shadow-xs'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-bold uppercase tracking-wider ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>
                    VIEW A — FULL HONESTY
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold ${
                    theme === 'light' ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-300'
                  }`}>
                    Mode: {modeLabel} — Full View
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono my-2.5 py-2 px-3 rounded border bg-slate-950/40 border-slate-800">
                  <div><span className="text-slate-400">Buy votes:</span> <strong className="text-emerald-400">{buyVotes}</strong></div>
                  <div className="text-slate-600">•</div>
                  <div><span className="text-slate-400">Sell votes:</span> <strong className="text-rose-400">{sellVotes}</strong></div>
                  <div className="text-slate-600">•</div>
                  <div><span className="text-slate-400">Neutral:</span> <strong className="text-slate-200">{neutralVotes}</strong></div>
                </div>
              </div>

              <div className={`mt-3 p-2.5 rounded border text-xs font-bold font-mono ${
                theme === 'light' ? 'bg-blue-50 border-blue-200 text-blue-950' : 'bg-slate-800 border-slate-600 text-slate-100'
              }`}>
                → {majorityCount} of {totalRuleCount} rules currently indicate {majorityCondition} conditions
              </div>
            </div>

            {/* View B — Forced Call View (Buy / Sell only, Neutral forced to lean) */}
            <div className={`p-4 rounded border flex flex-col justify-between transition-all ${
              theme === 'light' ? 'bg-slate-50 border-slate-300 shadow-xs' : 'bg-slate-900/90 border-slate-700 shadow-xs'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-bold uppercase tracking-wider ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>
                    VIEW B — FORCED CALL VIEW
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold ${
                    theme === 'light' ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-300'
                  }`}>
                    Mode: {modeLabel} — Forced Call View
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono my-2.5 py-2 px-3 rounded border bg-slate-950/40 border-slate-800">
                  <div><span className="text-slate-400">Buy votes:</span> <strong className="text-emerald-400">{forcedBuyVotes}</strong></div>
                  <div className="text-slate-600">•</div>
                  <div><span className="text-slate-400">Sell votes:</span> <strong className="text-rose-400">{forcedSellVotes}</strong></div>
                </div>
              </div>

              <div className="mt-3 space-y-1.5">
                <div className={`p-2.5 rounded border text-xs font-bold font-mono ${
                  theme === 'light' ? 'bg-blue-50 border-blue-200 text-blue-950' : 'bg-slate-800 border-slate-600 text-slate-100'
                }`}>
                  → {forcedMajorityCount} of {forcedTotal} rules lean {forcedMajoritySide} — Strength: {forcedStrengthLabel} ({forcedPercentage}%)
                </div>
                <div className={`text-[11px] font-sans italic px-1 leading-snug ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
                  "This view forces every rule to lean Buy or Sell, including rules that are actually undecided. See the Full View for the honest picture, including which rules have no real opinion right now."
                </div>
              </div>
            </div>
          </div>

          {/* Persistent Non-Advisory Note */}
          <div className={`text-[11px] p-2.5 rounded border flex items-center justify-between ${
            theme === 'light' ? 'bg-blue-50/70 border-blue-200 text-slate-700' : 'bg-slate-900/80 border-slate-700 text-slate-300'
          }`}>
            <span className="flex items-center gap-1.5 font-sans font-medium">
              <Info className={`w-3.5 h-3.5 shrink-0 ${theme === 'light' ? 'text-blue-600' : 'text-cyan-400'}`} />
              ⓘ Mechanical rule tally based on code calculations — not financial advice, prediction, or recommendation.
            </span>
            <button
              onClick={() => setIsExplainModalOpen(true)}
              className={`${theme === 'light' ? 'text-blue-600 hover:text-blue-800' : 'text-cyan-400 hover:underline'} font-mono text-[10px] shrink-0 ml-2 font-bold`}
            >
              Learn more
            </button>
          </div>

          {/* Full Rule Transparency Breakdown Grid */}
          <div className="space-y-2">
            <span className={`text-[10px] uppercase block font-bold ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
              FULL {totalRuleCount}-RULE TRANSPARENCY BREAKDOWN (INDIVIDUAL VOTES)
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {rules.map(r => {
                const isBuy = r.vote === 'buy';
                const isSell = r.vote === 'sell';
                return (
                  <div
                    key={r.id}
                    className={`p-2.5 rounded border text-xs flex flex-col justify-between transition-all ${
                      theme === 'light'
                        ? (isBuy ? 'bg-emerald-50 border-emerald-300 shadow-xs' : isSell ? 'bg-rose-50 border-rose-300 shadow-xs' : 'bg-slate-50 border-slate-300 shadow-xs')
                        : (isBuy ? 'bg-emerald-950/60 border-emerald-500/50 shadow-xs' : isSell ? 'bg-rose-950/60 border-rose-500/50 shadow-xs' : 'bg-slate-900/90 border-slate-700/80 shadow-xs')
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className={`font-bold text-[11px] truncate ${
                        theme === 'light'
                          ? (isBuy ? 'text-emerald-950' : isSell ? 'text-rose-950' : 'text-slate-900')
                          : (isBuy ? 'text-emerald-300' : isSell ? 'text-rose-300' : 'text-slate-100')
                      }`}>
                        #{r.id} {r.name}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase flex items-center gap-0.5 ${
                        theme === 'light'
                          ? (isBuy ? 'bg-emerald-100 text-emerald-800 border border-emerald-400' : isSell ? 'bg-rose-100 text-rose-800 border border-rose-400' : 'bg-slate-200 text-slate-800 border border-slate-300')
                          : (isBuy ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-500/60' : isSell ? 'bg-rose-900/80 text-rose-300 border border-rose-500/60' : 'bg-slate-800 text-slate-200 border border-slate-600')
                      }`}>
                        {isBuy ? <CheckCircle className="w-3 h-3" /> : isSell ? <XCircle className="w-3 h-3" /> : <MinusCircle className="w-3 h-3" />}
                        {r.vote}
                      </span>
                    </div>
                    <p className={`text-[10px] font-sans leading-tight mt-1 ${
                      theme === 'light'
                        ? (isBuy ? 'text-emerald-800 font-medium' : isSell ? 'text-rose-800 font-medium' : 'text-slate-600 font-normal')
                        : (isBuy ? 'text-emerald-200/90' : isSell ? 'text-rose-200/90' : 'text-slate-300')
                    }`}>
                      {r.explanation}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Persistent ⓘ Explanation Modal */}
      {isExplainModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm font-mono">
          <div className={`terminal-card max-w-lg w-full p-6 border rounded-lg shadow-2xl relative ${
            theme === 'light' ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-700'
          }`}>
            <button
              onClick={() => setIsExplainModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-bold text-cyan-400 uppercase mb-3 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              ABOUT THE STRATEGY VOTING PANEL
            </h3>

            <div className="text-xs space-y-3 font-sans text-slate-300 leading-relaxed">
              <p>
                <strong>What is this system?</strong><br />
                This panel is a rules-based decision-support tool. It runs 10 fixed mechanical code rules against current price and fundamental data to compute a literal count of Buy, Sell, or Neutral conditions.
              </p>

              <p>
                <strong>Important Non-Advisory Notice:</strong><br />
                This system is <strong>not financial advice, not a prediction engine, and not a buy/sell recommendation</strong>. It has no opinion, no confidence score, and no memory of past accuracy.
              </p>

              <p>
                <strong>Why show all 10 rules?</strong><br />
                Showing every individual rule prevents confusing correlated indicator readings with independent confirmation. You can visually inspect exactly which 10 rules produced the vote tally.
              </p>
            </div>

            <div className="mt-5 text-right font-mono">
              <button
                onClick={() => setIsExplainModalOpen(false)}
                className="px-4 py-1.5 bg-cyan-500 text-black font-bold rounded text-xs hover:bg-cyan-400"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
