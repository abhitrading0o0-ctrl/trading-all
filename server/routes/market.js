const express = require('express');
const router = express.Router();
const { getQuote, getCandles, getKeyData, searchInstruments } = require('../services/marketService');
const { getNewsForSymbol, getEconomicEvents } = require('../services/newsService');

// Live Quote Endpoint
router.get('/quote/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const { assetType = 'stock' } = req.query;
  try {
    const data = await getQuote(symbol, assetType);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: `Could not fetch live price for ${symbol}` });
  }
});

// Candlestick Endpoint (Multi-timeframe)
router.get('/candles/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const { assetType = 'stock', timeframe = '1d' } = req.query;
  try {
    const data = await getCandles(symbol, assetType, timeframe);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: `Could not fetch chart candles for ${symbol}` });
  }
});

// Key Data Fundamentals / Stats per Asset Class
router.get('/keydata/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const { assetType = 'stock' } = req.query;
  try {
    const data = await getKeyData(symbol, assetType);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: `Could not fetch key stats for ${symbol}` });
  }
});

// News Feed & Economic Events Endpoint
router.get('/news/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const { assetType = 'stock' } = req.query;
  try {
    const news = await getNewsForSymbol(symbol, assetType);
    const events = assetType === 'forex' ? getEconomicEvents(symbol) : [];
    res.json({ articles: news, events });
  } catch (error) {
    res.status(500).json({ error: `Could not fetch news feed for ${symbol}` });
  }
});

// Instrument Search / Autocomplete Endpoint
// Returns grouped results { stocks: [], crypto: [], forex: [] }
// Only matches against real, curated instrument lists (NSE stocks, forex pairs, CoinGecko crypto)
router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    return res.json({ stocks: [], crypto: [], forex: [] });
  }
  try {
    const results = await searchInstruments(q.trim());
    res.json(results);
  } catch (error) {
    console.error('Search error:', error.message);
    res.status(500).json({ error: 'Search temporarily unavailable', stocks: [], crypto: [], forex: [] });
  }
});

module.exports = router;
