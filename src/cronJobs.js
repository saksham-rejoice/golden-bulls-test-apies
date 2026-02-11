const cron = require('node-cron');
const { pool } = require('./db');

const currencyOptions = [
  "AUD/USD",
  "BTC/USD",
  "EUR/USD",
  "GBP/USD",
  "NZD/USD",
  "USD/CAD",
  "USD/CHF",
  "USD/JPY",
  "XAU/USD",
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const insertCurrencyData = async () => {
  try {
    console.log('Cron job started: Inserting currency data...');
    let requestCount = 0;

    for (const symbol of currencyOptions) {
      if (requestCount === 8) {
        console.log('Rate limit reached. Waiting 60 seconds...');
        await sleep(60000);
        requestCount = 0;
      }

      console.log(`Fetching data for ${symbol}...`);
      const response = await fetch(
        `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1day&outputsize=180&apikey=719132ad329042159b7a5c4422639e1a`
      );
      const data = await response.json();
      requestCount++;

      if (data.status === "ok") {
        const client = await pool.connect();
        await client.query(
          "INSERT INTO currency_timeseries (meta, values) VALUES ($1, $2)",
          [JSON.stringify(data.meta), JSON.stringify(data.values)]
        );
        client.release();
        console.log(`✓ ${symbol} inserted successfully`);
      } else {
        console.log(`✗ ${symbol} failed: ${data.message}`);
      }
    }

    console.log('Cron job completed.');
  } catch (err) {
    console.error('Cron job error:', err.message);
  }
};

// Run every 5 minutes
cron.schedule('*/5 * * * *', insertCurrencyData);

console.log('Cron job scheduled: Currency data will be inserted every 5 minutes');

module.exports = { insertCurrencyData };
