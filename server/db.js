const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

let dbInstance = null;

async function getDB() {
  if (dbInstance) return dbInstance;

  const dbPath = path.join(__dirname, 'trading.db');
  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Enable WAL mode for better concurrency
  await dbInstance.run('PRAGMA journal_mode = WAL');

  // Initialize Watchlist table
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS watchlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      asset_type TEXT NOT NULL,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Initialize Trades table
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      instrument TEXT NOT NULL,
      direction TEXT NOT NULL CHECK(direction IN ('long', 'short')),
      entry_price REAL NOT NULL,
      entry_time TEXT NOT NULL,
      exit_price REAL,
      exit_time TEXT,
      position_size REAL NOT NULL,
      stop_loss REAL,
      target REAL,
      strategy_tag TEXT,
      reasoning TEXT,
      win_reason TEXT,
      loss_reason TEXT,
      voting_mode TEXT,
      vote_tally TEXT,
      vote_strength INTEGER,
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'closed')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Ensure new columns exist on existing database
  try {
    const tableInfo = await dbInstance.all("PRAGMA table_info(trades)");
    const hasWinReason = tableInfo.some(col => col.name === 'win_reason');
    const hasLossReason = tableInfo.some(col => col.name === 'loss_reason');
    const hasVotingMode = tableInfo.some(col => col.name === 'voting_mode');
    const hasVoteTally = tableInfo.some(col => col.name === 'vote_tally');
    const hasVoteStrength = tableInfo.some(col => col.name === 'vote_strength');

    if (!hasWinReason) {
      await dbInstance.run('ALTER TABLE trades ADD COLUMN win_reason TEXT');
    }
    if (!hasLossReason) {
      await dbInstance.run('ALTER TABLE trades ADD COLUMN loss_reason TEXT');
    }
    if (!hasVotingMode) {
      await dbInstance.run('ALTER TABLE trades ADD COLUMN voting_mode TEXT');
    }
    if (!hasVoteTally) {
      await dbInstance.run('ALTER TABLE trades ADD COLUMN vote_tally TEXT');
    }
    if (!hasVoteStrength) {
      await dbInstance.run('ALTER TABLE trades ADD COLUMN vote_strength INTEGER');
    }
  } catch (e) {
    console.warn('Migration check warning:', e.message);
  }

  // One-time cleanup: remove invalid/broken watchlist entries that were added by the old
  // free-text input system and have no real data source backing them.
  const INVALID_SYMBOLS = ['FVBRFG', 'XAU-USD'];
  for (const badSymbol of INVALID_SYMBOLS) {
    try {
      const existing = await dbInstance.get('SELECT id, asset_type FROM watchlist WHERE symbol = ?', [badSymbol]);
      // Remove XAU-USD only if it was incorrectly stored as a 'stock' (the broken entry)
      if (existing && (badSymbol === 'FVBRFG' || (badSymbol === 'XAU-USD' && existing.asset_type === 'stock'))) {
        await dbInstance.run('DELETE FROM watchlist WHERE symbol = ?', [badSymbol]);
        console.log(`[DB Cleanup] Removed invalid watchlist entry: ${badSymbol}`);
      }
    } catch (e) {
      console.warn(`[DB Cleanup] Could not remove ${badSymbol}:`, e.message);
    }
  }

  // Seed default watchlist if empty
  const count = await dbInstance.get('SELECT COUNT(*) as cnt FROM watchlist');
  if (count && count.cnt === 0) {
    const defaultSymbols = [
      { symbol: 'RELIANCE.NS', name: 'Reliance Industries', asset_type: 'stock' },
      { symbol: 'TATASTEEL.NS', name: 'Tata Steel', asset_type: 'stock' },
      { symbol: 'INFY.NS', name: 'Infosys Ltd', asset_type: 'stock' },
      { symbol: 'BTC-USD', name: 'Bitcoin (BTC/USD)', asset_type: 'crypto' },
      { symbol: 'ETH-USD', name: 'Ethereum (ETH/USD)', asset_type: 'crypto' },
      { symbol: 'EURUSD=X', name: 'EUR / USD', asset_type: 'forex' },
      { symbol: 'USDINR=X', name: 'USD / INR', asset_type: 'forex' }
    ];

    for (const item of defaultSymbols) {
      await dbInstance.run(
        'INSERT OR IGNORE INTO watchlist (symbol, name, asset_type) VALUES (?, ?, ?)',
        [item.symbol, item.name, item.asset_type]
      );
    }
  }

  return dbInstance;
}

module.exports = { getDB };
