const express = require('express');
const router = express.Router();
const { getDB } = require('../db');

// Helper to calculate P&L and R:R
function calculateTradeMetrics(trade) {
  const { direction, entry_price, exit_price, position_size, stop_loss, target, status } = trade;
  
  let pnl = 0;
  let pnlPercent = 0;
  let riskReward = 0;

  const isLong = direction.toLowerCase() === 'long';
  const currentOrExitPrice = status === 'closed' && exit_price != null ? exit_price : entry_price;

  if (isLong) {
    pnl = (currentOrExitPrice - entry_price) * position_size;
    pnlPercent = entry_price > 0 ? ((currentOrExitPrice - entry_price) / entry_price) * 100 : 0;

    if (stop_loss && target && stop_loss !== entry_price) {
      const plannedRisk = Math.abs(entry_price - stop_loss);
      const plannedReward = Math.abs(target - entry_price);
      const riskUnit = plannedRisk > 0 ? plannedReward / plannedRisk : 0;
      
      if (status === 'closed' && exit_price != null) {
        const achievedReward = exit_price - entry_price;
        riskReward = plannedRisk > 0 ? achievedReward / plannedRisk : 0;
      } else {
        riskReward = riskUnit;
      }
    }
  } else { // Short
    pnl = (entry_price - currentOrExitPrice) * position_size;
    pnlPercent = entry_price > 0 ? ((entry_price - currentOrExitPrice) / entry_price) * 100 : 0;

    if (stop_loss && target && stop_loss !== entry_price) {
      const plannedRisk = Math.abs(stop_loss - entry_price);
      const plannedReward = Math.abs(entry_price - target);
      const riskUnit = plannedRisk > 0 ? plannedReward / plannedRisk : 0;

      if (status === 'closed' && exit_price != null) {
        const achievedReward = entry_price - exit_price;
        riskReward = plannedRisk > 0 ? achievedReward / plannedRisk : 0;
      } else {
        riskReward = riskUnit;
      }
    }
  }

  return {
    ...trade,
    calculatedPnl: Number(pnl.toFixed(2)),
    calculatedPnlPercent: Number(pnlPercent.toFixed(2)),
    riskRewardRatio: Number(riskReward.toFixed(2))
  };
}

// Get all trades
router.get('/', async (req, res) => {
  try {
    const db = await getDB();
    const trades = await db.all('SELECT * FROM trades ORDER BY entry_time DESC');
    const enriched = trades.map(calculateTradeMetrics);
    res.json(enriched);
  } catch (error) {
    console.error('Error fetching trades:', error);
    res.status(500).json({ error: 'Failed to retrieve trade journal entries' });
  }
});

// Aggregate Trade Stats & Equity Curve Series
router.get('/stats', async (req, res) => {
  try {
    const db = await getDB();
    const trades = await db.all('SELECT * FROM trades ORDER BY entry_time ASC');
    const enriched = trades.map(calculateTradeMetrics);

    const totalTrades = enriched.length;
    const closedTrades = enriched.filter(t => t.status === 'closed');
    const winningTrades = closedTrades.filter(t => t.calculatedPnl > 0);

    const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;
    
    const totalPnl = enriched.reduce((acc, t) => acc + t.calculatedPnl, 0);
    
    const rrSum = enriched.reduce((acc, t) => acc + Math.max(0, t.riskRewardRatio), 0);
    const avgRR = totalTrades > 0 ? rrSum / totalTrades : 0;

    const bestTrade = enriched.reduce((max, t) => (t.calculatedPnl > (max?.calculatedPnl ?? -Infinity) ? t : max), null);
    const worstTrade = enriched.reduce((min, t) => (t.calculatedPnl < (min?.calculatedPnl ?? Infinity) ? t : min), null);

    // Vote strength performance breakdown (High consensus: 4+ votes vs Lower consensus: <=3 votes)
    const highConsensusTrades = closedTrades.filter(t => (t.vote_strength || 0) >= 4);
    const highConsensusWins = highConsensusTrades.filter(t => t.calculatedPnl > 0);
    const highConsensusWinRate = highConsensusTrades.length > 0 ? (highConsensusWins.length / highConsensusTrades.length) * 100 : 0;

    const splitConsensusTrades = closedTrades.filter(t => (t.vote_strength || 0) > 0 && (t.vote_strength || 0) <= 3);
    const splitConsensusWins = splitConsensusTrades.filter(t => t.calculatedPnl > 0);
    const splitConsensusWinRate = splitConsensusTrades.length > 0 ? (splitConsensusWins.length / splitConsensusTrades.length) * 100 : 0;

    // Calculate cumulative equity curve points
    let cumulativePnl = 0;
    const equityCurve = enriched.map((t, idx) => {
      cumulativePnl += t.calculatedPnl;
      return {
        tradeIndex: idx + 1,
        time: t.entry_time.split('T')[0] || t.entry_time,
        pnl: t.calculatedPnl,
        cumulativePnl: Number(cumulativePnl.toFixed(2)),
        instrument: t.instrument
      };
    });

    res.json({
      totalTrades,
      closedTradesCount: closedTrades.length,
      openTradesCount: totalTrades - closedTrades.length,
      winRate: Number(winRate.toFixed(1)),
      totalPnl: Number(totalPnl.toFixed(2)),
      avgRR: Number(avgRR.toFixed(2)),
      bestTradePnl: bestTrade ? bestTrade.calculatedPnl : 0,
      worstTradePnl: worstTrade ? worstTrade.calculatedPnl : 0,
      highConsensusCount: highConsensusTrades.length,
      highConsensusWinRate: Number(highConsensusWinRate.toFixed(1)),
      splitConsensusCount: splitConsensusTrades.length,
      splitConsensusWinRate: Number(splitConsensusWinRate.toFixed(1)),
      equityCurve
    });
  } catch (error) {
    console.error('Error fetching trade stats:', error);
    res.status(500).json({ error: 'Failed to compute trade statistics' });
  }
});

// Add Trade Entry
router.post('/', async (req, res) => {
  const {
    instrument,
    direction,
    entry_price,
    entry_time,
    exit_price,
    exit_time,
    position_size,
    stop_loss,
    target,
    strategy_tag,
    reasoning,
    win_reason,
    loss_reason,
    voting_mode,
    vote_tally,
    vote_strength,
    status
  } = req.body;

  if (!instrument || !direction || entry_price == null || !position_size) {
    return res.status(400).json({ error: 'Instrument, direction, entry price, and position size are required.' });
  }

  try {
    const db = await getDB();
    const tradeStatus = status || (exit_price != null ? 'closed' : 'open');
    const timeNow = entry_time || new Date().toISOString();

    const result = await db.run(
      `INSERT INTO trades (
        instrument, direction, entry_price, entry_time, exit_price, exit_time,
        position_size, stop_loss, target, strategy_tag, reasoning, win_reason, loss_reason,
        voting_mode, vote_tally, vote_strength, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        instrument.trim().toUpperCase(),
        direction.toLowerCase(),
        Number(entry_price),
        timeNow,
        exit_price != null ? Number(exit_price) : null,
        exit_time || null,
        Number(position_size),
        stop_loss != null ? Number(stop_loss) : null,
        target != null ? Number(target) : null,
        strategy_tag ? strategy_tag.trim() : 'General',
        reasoning ? reasoning.trim() : '',
        win_reason ? win_reason.trim() : '',
        loss_reason ? loss_reason.trim() : '',
        voting_mode || null,
        vote_tally || null,
        vote_strength != null ? Number(vote_strength) : null,
        tradeStatus
      ]
    );

    const inserted = await db.get('SELECT * FROM trades WHERE id = ?', [result.lastID]);
    res.status(201).json(calculateTradeMetrics(inserted));
  } catch (error) {
    console.error('Error creating trade entry:', error);
    res.status(500).json({ error: 'Failed to log trade entry' });
  }
});

// Update Trade Entry
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const {
    instrument,
    direction,
    entry_price,
    entry_time,
    exit_price,
    exit_time,
    position_size,
    stop_loss,
    target,
    strategy_tag,
    reasoning,
    win_reason,
    loss_reason,
    voting_mode,
    vote_tally,
    vote_strength,
    status
  } = req.body;

  try {
    const db = await getDB();
    const existing = await db.get('SELECT * FROM trades WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Trade entry not found' });
    }

    const newStatus = status || (exit_price != null ? 'closed' : existing.status);

    await db.run(
      `UPDATE trades SET
        instrument = ?, direction = ?, entry_price = ?, entry_time = ?, exit_price = ?, exit_time = ?,
        position_size = ?, stop_loss = ?, target = ?, strategy_tag = ?, reasoning = ?, win_reason = ?, loss_reason = ?,
        voting_mode = ?, vote_tally = ?, vote_strength = ?, status = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        instrument || existing.instrument,
        direction || existing.direction,
        entry_price != null ? Number(entry_price) : existing.entry_price,
        entry_time || existing.entry_time,
        exit_price != null ? Number(exit_price) : existing.exit_price,
        exit_time || existing.exit_time,
        position_size != null ? Number(position_size) : existing.position_size,
        stop_loss != null ? Number(stop_loss) : existing.stop_loss,
        target != null ? Number(target) : existing.target,
        strategy_tag !== undefined ? strategy_tag : existing.strategy_tag,
        reasoning !== undefined ? reasoning : existing.reasoning,
        win_reason !== undefined ? win_reason : existing.win_reason,
        loss_reason !== undefined ? loss_reason : existing.loss_reason,
        voting_mode !== undefined ? voting_mode : existing.voting_mode,
        vote_tally !== undefined ? vote_tally : existing.vote_tally,
        vote_strength !== undefined ? vote_strength : existing.vote_strength,
        newStatus,
        id
      ]
    );

    const updated = await db.get('SELECT * FROM trades WHERE id = ?', [id]);
    res.json(calculateTradeMetrics(updated));
  } catch (error) {
    console.error('Error updating trade entry:', error);
    res.status(500).json({ error: 'Failed to update trade entry' });
  }
});

// Delete Trade Entry
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const db = await getDB();
    await db.run('DELETE FROM trades WHERE id = ?', [id]);
    res.json({ message: 'Trade entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting trade:', error);
    res.status(500).json({ error: 'Failed to delete trade entry' });
  }
});

module.exports = router;
