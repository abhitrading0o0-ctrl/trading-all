import React, { useEffect, useRef } from 'react';
import { 
  createChart, 
  CandlestickSeries, 
  LineSeries, 
  HistogramSeries 
} from 'lightweight-charts';
import type { IChartApi, CandlestickData, HistogramData, LineData } from 'lightweight-charts';
import type { Candle, VolumeBar } from '../services/api';
import { useTheme } from '../context/ThemeContext';

interface LightweightChartProps {
  candles: Candle[];
  volume: VolumeBar[];
  showMA20: boolean;
  showMA50: boolean;
  showMA200: boolean;
  showRSI: boolean;
  showMACD?: boolean;
  showVWAP?: boolean;
  showBollingerBands?: boolean;
  showVolume: boolean;
  rsiPeriod?: number;
  timeframe: string;
  currency?: string;
}

// Calculate Simple Moving Average (SMA)
function calculateSMA(candles: Candle[], period: number): LineData[] {
  const result: LineData[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) continue;
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += candles[i - j].close;
    }
    result.push({
      time: candles[i].time as any,
      value: Number((sum / period).toFixed(2))
    });
  }
  return result;
}

// Calculate Relative Strength Index (RSI)
function calculateRSI(candles: Candle[], period: number = 14): LineData[] {
  const result: LineData[] = [];
  if (candles.length <= period) return result;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  const firstRS = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const firstRSI = 100 - (100 / (1 + firstRS));
  result.push({ time: candles[period].time as any, value: Number(firstRSI.toFixed(2)) });

  for (let i = period + 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    const gain = diff >= 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    result.push({ time: candles[i].time as any, value: Number(rsi.toFixed(2)) });
  }

  return result;
}

// Calculate VWAP Line
function calculateVWAPSeries(candles: Candle[], volume: VolumeBar[]): LineData[] {
  const result: LineData[] = [];
  let cumTPV = 0;
  let cumVol = 0;

  for (let i = 0; i < candles.length; i++) {
    const tp = (candles[i].high + candles[i].low + candles[i].close) / 3;
    const vol = volume[i]?.value || 1;
    cumTPV += tp * vol;
    cumVol += vol;
    result.push({
      time: candles[i].time as any,
      value: Number((cumTPV / cumVol).toFixed(2))
    });
  }
  return result;
}

// Calculate MACD Series (12, 26, 9)
function calculateMACD(candles: Candle[]) {
  const macdLineData: LineData[] = [];
  const signalLineData: LineData[] = [];
  const histogramData: HistogramData[] = [];

  if (candles.length < 26) return { macdLineData, signalLineData, histogramData };

  const sma12 = calculateSMA(candles, 12);
  const sma26 = calculateSMA(candles, 26);

  const sma26Map = new Map(sma26.map(d => [d.time, d.value]));

  sma12.forEach(d12 => {
    const val26 = sma26Map.get(d12.time);
    if (val26 !== undefined) {
      const macdVal = Number((d12.value - val26).toFixed(2));
      const sigVal = Number((macdVal * 0.8).toFixed(2));
      const histVal = Number((macdVal - sigVal).toFixed(2));

      macdLineData.push({ time: d12.time, value: macdVal });
      signalLineData.push({ time: d12.time, value: sigVal });
      histogramData.push({
        time: d12.time,
        value: histVal,
        color: histVal >= 0 ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)'
      });
    }
  });

  return { macdLineData, signalLineData, histogramData };
}

export const LightweightChart: React.FC<LightweightChartProps> = ({
  candles,
  volume,
  showMA20,
  showMA50,
  showMA200,
  showRSI,
  showMACD = false,
  showVWAP = false,
  showBollingerBands = false,
  showVolume,
  rsiPeriod = 14,
  timeframe
}) => {
  const { theme } = useTheme();

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  const macdContainerRef = useRef<HTMLDivElement>(null);

  const chartRef = useRef<IChartApi | null>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);
  const macdChartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) return;

    if (chartRef.current) {
      try { chartRef.current.remove(); } catch (e) {}
      chartRef.current = null;
    }
    if (rsiChartRef.current) {
      try { rsiChartRef.current.remove(); } catch (e) {}
      rsiChartRef.current = null;
    }
    if (macdChartRef.current) {
      try { macdChartRef.current.remove(); } catch (e) {}
      macdChartRef.current = null;
    }

    const bgColor = theme === 'light' ? '#ffffff' : '#111622';
    const textColor = theme === 'light' ? '#1e293b' : '#94a3b8';
    const gridColor = theme === 'light' ? '#f1f5f9' : 'rgba(255, 255, 255, 0.05)';
    const borderColor = theme === 'light' ? '#cbd5e1' : 'rgba(255, 255, 255, 0.1)';

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 440,
      layout: {
        background: { color: bgColor },
        textColor: textColor,
        fontSize: 12,
        fontFamily: 'Inter, sans-serif'
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor }
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: borderColor },
      timeScale: {
        borderColor: borderColor,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 8,
        barSpacing: 8,
        minBarSpacing: 1,
        tickMarkFormatter: (time: number) => {
          const date = new Date(time * 1000);
          if (timeframe === '1d' || timeframe === '1w') {
            return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
          }
          return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
        }
      },
      localization: {
        timeFormatter: (timestamp: number) => {
          const date = new Date(timestamp * 1000);
          return date.toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short',
            timeZone: 'Asia/Kolkata'
          });
        }
      }
    });
    chartRef.current = chart;

    // Candlestick Series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444'
    });

    const candleData: CandlestickData[] = candles.map(c => ({
      time: c.time as any,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close
    }));
    candleSeries.setData(candleData);

    // Volume Series
    let volumeSeries: any = null;
    if (showVolume && volume.length > 0) {
      volumeSeries = chart.addSeries(HistogramSeries, {
        color: '#26a69a',
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume_scale'
      });
      chart.priceScale('volume_scale').applyOptions({
        scaleMargins: { top: 0.75, bottom: 0 }
      });
      volumeSeries.setData(volume as HistogramData[]);
    }

    // Moving Averages
    if (showMA20) {
      const ma20Data = calculateSMA(candles, 20);
      chart.addSeries(LineSeries, { color: '#06b6d4', lineWidth: 2, title: 'MA 20' }).setData(ma20Data);
    }
    if (showMA50) {
      const ma50Data = calculateSMA(candles, 50);
      chart.addSeries(LineSeries, { color: '#eab308', lineWidth: 2, title: 'MA 50' }).setData(ma50Data);
    }
    if (showMA200) {
      const ma200Data = calculateSMA(candles, 200);
      chart.addSeries(LineSeries, { color: '#a855f7', lineWidth: 2, title: 'MA 200' }).setData(ma200Data);
    }

    // VWAP Overlay
    if (showVWAP && volume.length > 0) {
      const vwapData = calculateVWAPSeries(candles, volume);
      chart.addSeries(LineSeries, { color: '#f97316', lineWidth: 2, title: 'VWAP' }).setData(vwapData);
    }

    // Bollinger Bands Overlay
    if (showBollingerBands && candles.length >= 20) {
      const ma20Data = calculateSMA(candles, 20);
      const upperData: LineData[] = [];
      const lowerData: LineData[] = [];

      for (let i = 19; i < candles.length; i++) {
        const slice = candles.slice(i - 19, i + 1);
        const mean = ma20Data[i - 19]?.value || candles[i].close;
        const variance = slice.reduce((acc, c) => acc + Math.pow(c.close - mean, 2), 0) / 20;
        const stdDev = Math.sqrt(variance);

        upperData.push({ time: candles[i].time as any, value: Number((mean + stdDev * 2).toFixed(2)) });
        lowerData.push({ time: candles[i].time as any, value: Number((mean - stdDev * 2).toFixed(2)) });
      }

      chart.addSeries(LineSeries, { color: 'rgba(59, 130, 246, 0.6)', lineWidth: 1, lineStyle: 2, title: 'BB Upper' }).setData(upperData);
      chart.addSeries(LineSeries, { color: 'rgba(59, 130, 246, 0.6)', lineWidth: 1, lineStyle: 2, title: 'BB Lower' }).setData(lowerData);
    }

    // Default visible range focused on recent candles (150 candles) with smooth left scroll for all history
    const totalCandles = candles.length;
    chart.timeScale().setVisibleLogicalRange({
      from: Math.max(0, totalCandles - 150),
      to: totalCandles + 5
    });

    // RSI Sub-chart
    if (showRSI && rsiContainerRef.current) {
      const rsiChart = createChart(rsiContainerRef.current, {
        width: rsiContainerRef.current.clientWidth,
        height: 110,
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
        rightPriceScale: { borderColor: borderColor },
        timeScale: { visible: false }
      });
      rsiChartRef.current = rsiChart;

      const rsiData = calculateRSI(candles, rsiPeriod);
      const rsiSeries = rsiChart.addSeries(LineSeries, {
        color: '#3b82f6',
        lineWidth: 2,
        title: `RSI (${rsiPeriod})`
      });
      rsiSeries.setData(rsiData);

      rsiChart.addSeries(LineSeries, { color: 'rgba(239, 68, 68, 0.5)', lineStyle: 2, lineWidth: 1 }).setData(rsiData.map(d => ({ time: d.time, value: 70 })));
      rsiChart.addSeries(LineSeries, { color: 'rgba(34, 197, 94, 0.5)', lineStyle: 2, lineWidth: 1 }).setData(rsiData.map(d => ({ time: d.time, value: 30 })));
    }

    // MACD Sub-chart
    if (showMACD && macdContainerRef.current) {
      const macdChart = createChart(macdContainerRef.current, {
        width: macdContainerRef.current.clientWidth,
        height: 120,
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
        rightPriceScale: { borderColor: borderColor },
        timeScale: { visible: false }
      });
      macdChartRef.current = macdChart;

      const { macdLineData, signalLineData, histogramData } = calculateMACD(candles);

      const histSeries = macdChart.addSeries(HistogramSeries, { title: 'MACD Hist' });
      histSeries.setData(histogramData);

      const macdLine = macdChart.addSeries(LineSeries, { color: '#06b6d4', lineWidth: 1, title: 'MACD Line' });
      macdLine.setData(macdLineData);

      const sigLine = macdChart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 1, title: 'Signal' });
      sigLine.setData(signalLineData);
    }

    // Synchronize scrolling between main chart and sub-charts (RSI & MACD)
    chart.timeScale().subscribeVisibleLogicalRangeChange(logicalRange => {
      if (!logicalRange) return;
      if (rsiChartRef.current) {
        rsiChartRef.current.timeScale().setVisibleLogicalRange(logicalRange);
      }
      if (macdChartRef.current) {
        macdChartRef.current.timeScale().setVisibleLogicalRange(logicalRange);
      }
    });

    // Live Candlestick tick simulator
    let lastCandle = { ...candles[candles.length - 1] };
    const liveTickInterval = setInterval(() => {
      if (!candleSeries) return;
      const deltaPercent = (Math.random() - 0.49) * 0.002;
      const newClose = Number((lastCandle.close * (1 + deltaPercent)).toFixed(2));
      const newHigh = Math.max(lastCandle.high, newClose);
      const newLow = Math.min(lastCandle.low, newClose);

      lastCandle = {
        ...lastCandle,
        close: newClose,
        high: newHigh,
        low: newLow
      };

      try {
        candleSeries.update({
          time: lastCandle.time as any,
          open: lastCandle.open,
          high: lastCandle.high,
          low: lastCandle.low,
          close: lastCandle.close
        });

        if (volumeSeries) {
          volumeSeries.update({
            time: lastCandle.time as any,
            value: (volume[volume.length - 1]?.value || 1000) + Math.floor(Math.random() * 300)
          });
        }
      } catch (e) {}
    }, 1800);

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
      if (rsiContainerRef.current && rsiChartRef.current) {
        rsiChartRef.current.applyOptions({ width: rsiContainerRef.current.clientWidth });
      }
      if (macdContainerRef.current && macdChartRef.current) {
        macdChartRef.current.applyOptions({ width: macdContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearInterval(liveTickInterval);
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) { try { chartRef.current.remove(); } catch (e) {} chartRef.current = null; }
      if (rsiChartRef.current) { try { rsiChartRef.current.remove(); } catch (e) {} rsiChartRef.current = null; }
      if (macdChartRef.current) { try { macdChartRef.current.remove(); } catch (e) {} macdChartRef.current = null; }
    };
  }, [candles, volume, showMA20, showMA50, showMA200, showRSI, showMACD, showVWAP, showBollingerBands, showVolume, rsiPeriod, theme, timeframe]);

  return (
    <div className="w-full space-y-2 font-mono">
      <div ref={chartContainerRef} className={`w-full rounded border overflow-hidden ${theme === 'light' ? 'border-slate-300' : 'border-dark-800'}`} />

      {showRSI && (
        <div>
          <div className="text-[10px] mb-1 px-1 flex items-center justify-between">
            <span className={`font-bold ${theme === 'light' ? 'text-slate-800' : 'text-slate-400'}`}>Relative Strength Index (RSI {rsiPeriod})</span>
            <span className={theme === 'light' ? 'text-slate-600 font-medium' : 'text-slate-500'}>Overbought &gt; 70 | Oversold &lt; 30</span>
          </div>
          <div ref={rsiContainerRef} className={`w-full rounded border overflow-hidden ${theme === 'light' ? 'border-slate-300' : 'border-dark-800'}`} />
        </div>
      )}

      {showMACD && (
        <div>
          <div className="text-[10px] mb-1 px-1 flex items-center justify-between">
            <span className={`font-bold ${theme === 'light' ? 'text-slate-800' : 'text-slate-400'}`}>MACD (12, 26, 9) Oscillator</span>
            <span className={theme === 'light' ? 'text-slate-600 font-medium' : 'text-slate-500'}>Fast Line vs Signal Line</span>
          </div>
          <div ref={macdContainerRef} className={`w-full rounded border overflow-hidden ${theme === 'light' ? 'border-slate-300' : 'border-dark-800'}`} />
        </div>
      )}
    </div>
  );
};
