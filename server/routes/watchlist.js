const express = require('express');
const router = express.Router();
const { getDB } = require('../db');
const { getQuote, getCandles } = require('../services/marketService');

// Get all watchlist items with enriched live quotes & mini sparkline data
router.get('/', async (req, res) => {
  try {
    const db = await getDB();
    const items = await db.all('SELECT * FROM watchlist ORDER BY added_at DESC');

    const enrichedItems = await Promise.all(
      items.map(async (item) => {
        try {
          const quote = await getQuote(item.symbol, item.asset_type);
          const candleData = await getCandles(item.symbol, item.asset_type, '1d');
          const sparkline = (candleData.candles || []).slice(-15).map(c => c.close);

          return {
            id: item.id,
            symbol: item.symbol,
            name: item.name || quote.name,
            asset_type: item.asset_type,
            price: quote.price,
            change: quote.change,
            changePercent: quote.changePercent,
            currency: quote.currency,
            dayHigh: quote.dayHigh,
            dayLow: quote.dayLow,
            timestamp: quote.timestamp,
            sparkline,
            error: quote.error
          };
        } catch (err) {
          console.error(`Error enriching watchlist item ${item.symbol}:`, err.message);
          return {
            id: item.id,
            symbol: item.symbol,
            name: item.name || item.symbol,
            asset_type: item.asset_type,
            price: 0,
            change: 0,
            changePercent: 0,
            currency: item.asset_type === 'stock' ? '₹' : '$',
            dayHigh: 0,
            dayLow: 0,
            timestamp: new Date().toISOString(),
            sparkline: [],
            error: 'Failed to enrich live telemetry'
          };
        }
      })
    );

    res.json(enrichedItems);
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    res.status(500).json({ error: 'Failed to retrieve watchlist items' });
  }
});

// Add instrument to watchlist
router.post('/', async (req, res) => {
  const { symbol, name, asset_type } = req.body;
  if (!symbol || !asset_type) {
    return res.status(400).json({ error: 'Symbol and asset_type are required' });
  }

  try {
    const db = await getDB();
    const cleanSymbol = symbol.trim().toUpperCase();

    // Verify live data is actually available before inserting
    const quote = await getQuote(cleanSymbol, asset_type);

    // Reject if the data source returned an error or a zero price
    // (price=0 + error field = the symbol doesn't resolve to real data)
    if (quote.error && quote.price === 0) {
      return res.status(422).json({
        error: `Couldn't load live data for ${cleanSymbol} right now — verify the symbol is correct and try again shortly.`
      });
    }

    const displayName = name || quote.name || cleanSymbol;

    const result = await db.run(
      'INSERT INTO watchlist (symbol, name, asset_type) VALUES (?, ?, ?)',
      [cleanSymbol, displayName, asset_type]
    );

    res.status(201).json({
      id: result.lastID,
      symbol: cleanSymbol,
      name: displayName,
      asset_type,
      message: `${displayName} added to watchlist.`
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: `${symbol} is already in your watchlist.` });
    }
    console.error('Error adding to watchlist:', error);
    res.status(500).json({ error: 'Failed to add instrument to watchlist' });
  }
});

// Delete instrument from watchlist
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const db = await getDB();
    await db.run('DELETE FROM watchlist WHERE id = ?', [id]);
    res.json({ message: 'Instrument removed from watchlist' });
  } catch (error) {
    console.error('Error deleting watchlist item:', error);
    res.status(500).json({ error: 'Failed to remove instrument from watchlist' });
  }
});

module.exports = router;
