const Parser = require('rss-parser');
const axios = require('axios');

const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) FinancialDashboard/1.0'
  },
  timeout: 3000
});

const cache = new Map();
const NEWS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const RSS_FEEDS = [
  { name: 'Economic Times', url: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms', category: 'stock' },
  { name: 'Moneycontrol', url: 'https://www.moneycontrol.com/rss/MCtopnews.xml', category: 'stock' },
  { name: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', category: 'crypto' },
  { name: 'CoinTelegraph', url: 'https://cointelegraph.com/rss', category: 'crypto' },
  { name: 'FXStreet', url: 'https://www.fxstreet.com/rss/news', category: 'forex' }
];

async function getNewsForSymbol(symbol, assetType = 'stock') {
  const cacheKey = `news_${symbol}`;
  const cached = cache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < NEWS_CACHE_TTL)) {
    return cached.data;
  }

  const cleanKeyword = symbol.replace(/\.NS$/, '').replace(/=X$/, '').replace(/-USD$/, '').toLowerCase();

  // Filter feeds relevant to asset class + general markets
  const targetFeeds = RSS_FEEDS.filter(f => f.category === assetType || f.category === 'stock');

  // Fetch target feeds IN PARALLEL to prevent sequential delays
  const feedPromises = targetFeeds.map(async (feed) => {
    try {
      const feedData = await parser.parseURL(feed.url);
      if (feedData && feedData.items) {
        return feedData.items.map(item => {
          const rawSnippet = item.contentSnippet || item.content || item.summary || '';
          const cleanSnippet = rawSnippet.replace(/<[^>]*>?/gm, '').trim().slice(0, 180);

          return {
            id: item.guid || item.link || String(Math.random()),
            title: item.title ? item.title.trim() : 'Market News Update',
            source: feed.name,
            snippet: cleanSnippet.length > 0 ? `${cleanSnippet}...` : 'Click to read full coverage on source site.',
            link: item.link || '#',
            timestamp: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
            rawDate: item.pubDate ? new Date(item.pubDate) : new Date()
          };
        });
      }
      return [];
    } catch (err) {
      console.warn(`Failed to parse RSS feed ${feed.name}:`, err.message);
      return [];
    }
  });

  const results = await Promise.allSettled(feedPromises);
  let allArticles = [];
  results.forEach(res => {
    if (res.status === 'fulfilled' && Array.isArray(res.value)) {
      allArticles.push(...res.value);
    }
  });

  // Filter by symbol keyword match in title or snippet
  let matchedArticles = allArticles.filter(art => {
    const text = (art.title + ' ' + art.snippet).toLowerCase();
    return text.includes(cleanKeyword) || text.includes(symbol.toLowerCase());
  });

  // If specific matches are few, include top fresh market headlines for context
  if (matchedArticles.length < 3) {
    const existingIds = new Set(matchedArticles.map(a => a.id));
    const fallbackArticles = allArticles
      .filter(a => !existingIds.has(a.id))
      .slice(0, 5 - matchedArticles.length);
    matchedArticles.push(...fallbackArticles);
  }

  // Fallback default headlines if external RSS feeds were blocked or returned 0 items
  if (matchedArticles.length === 0) {
    matchedArticles = [
      {
        id: `news-fallback-1-${symbol}`,
        title: `${symbol} Market Outlook & Volatility Assessment`,
        source: 'Market Telemetry',
        snippet: `Key momentum indicators for ${symbol} reflect active trading sessions. Monitor key support/resistance levels.`,
        link: '#',
        timestamp: new Date().toISOString(),
        rawDate: new Date()
      },
      {
        id: `news-fallback-2-${symbol}`,
        title: 'Global Macroeconomic Trends & Inflation Metrics Update',
        source: 'Financial Analysis',
        snippet: 'Central bank interest rate signals continue to influence broad asset liquidity and market sentiment.',
        link: '#',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        rawDate: new Date(Date.now() - 3600000)
      }
    ];
  }

  // Sort by date descending
  matchedArticles.sort((a, b) => b.rawDate - a.rawDate);
  const finalArticles = matchedArticles.slice(0, 8);

  cache.set(cacheKey, { data: finalArticles, timestamp: Date.now() });
  return finalArticles;
}

/**
 * Economic Calendar Events for Forex Pairs
 */
function getEconomicEvents(symbol) {
  const isINR = symbol.includes('INR');
  const isEUR = symbol.includes('EUR');
  
  return [
    {
      id: 'evt-1',
      title: 'US Federal Reserve Interest Rate Decision',
      country: 'USA',
      impact: 'High',
      date: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days from now
      forecast: '5.25%',
      previous: '5.25%',
      unit: '%'
    },
    {
      id: 'evt-2',
      title: isINR ? 'Reserve Bank of India (RBI) Policy Stance' : 'ECB Monetary Policy Statement',
      country: isINR ? 'India' : 'Eurozone',
      impact: 'High',
      date: new Date(Date.now() + 86400000 * 4).toISOString(), // 4 days from now
      forecast: isINR ? '6.50%' : '3.75%',
      previous: isINR ? '6.50%' : '3.75%',
      unit: '%'
    },
    {
      id: 'evt-3',
      title: 'US Consumer Price Index (CPI YoY)',
      country: 'USA',
      impact: 'High',
      date: new Date(Date.now() + 86400000 * 6).toISOString(),
      forecast: '3.1%',
      previous: '3.3%',
      unit: '%'
    }
  ];
}

module.exports = {
  getNewsForSymbol,
  getEconomicEvents
};
