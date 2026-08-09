const express = require('express');
const cors = require('cors');
const { getDB } = require('./db');

const watchlistRoutes = require('./routes/watchlist');
const marketRoutes = require('./routes/market');
const tradesRoutes = require('./routes/trades');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Log incoming API requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// API Routes
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/trades', tradesRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), app: 'Trading Dashboard Server' });
});

// Start Server and Initialize SQLite DB
getDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Backend Trading Server running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
