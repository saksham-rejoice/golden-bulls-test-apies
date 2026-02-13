const { connectDb } = require("../../db");

const instruments = [
  { symbol: "AUD/JPY", asset: "forex" },
  { symbol: "BTC/USD", asset: "crypto" },
  { symbol: "HG", asset: "commodity" },      // Copper
  { symbol: "EWJ", asset: "stock" },         // Japan proxy
  { symbol: "QQQ", asset: "stock" },         // Nasdaq proxy
  { symbol: "SPY", asset: "stock" },         // S&P proxy
  { symbol: "UUP", asset: "stock" },         // USD proxy
  { symbol: "VIXY", asset: "stock" },        // Vol proxy
  { symbol: "XAU/USD", asset: "forex" }
];


const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const insertMarketDataController = async (req, res) => {
  try {
    const client = await connectDb();
    let requestCount = 0;
    const results = [];

    for (const instrument of instruments) {
      try {
        if (requestCount === 8) {
          console.log("Rate limit hit. Waiting 60 seconds...");
          await sleep(60000);
          requestCount = 0;
        }

        console.log(`Fetching ${instrument.symbol}...`);

        const response = await fetch(
          `https://api.twelvedata.com/time_series?symbol=${instrument.symbol}&interval=1day&outputsize=200&apikey=719132ad329042159b7a5c4422639e1a`
        );

        const data = await response.json();
        requestCount++;

        if (data.status !== "ok") {
          console.log(`✗ ${instrument.symbol} failed: ${data.message}`);
          results.push({
            symbol: instrument.symbol,
            success: false,
            error: data.message,
          });
          continue;
        }

        for (const candle of data.values) {
          await client.query(
            `
            INSERT INTO market_daily
            (symbol, asset_type, datetime, open, high, low, close)
            VALUES ($1,$2,$3,$4,$5,$6,$7)
            ON CONFLICT (symbol, datetime)
            DO UPDATE SET
              open = EXCLUDED.open,
              high = EXCLUDED.high,
              low = EXCLUDED.low,
              close = EXCLUDED.close
            `,
            [
              instrument.symbol,
              instrument.asset,
              candle.datetime,
              candle.open,
              candle.high,
              candle.low,
              candle.close,
            ]
          );
        }

        console.log(`✓ ${instrument.symbol} inserted`);
        results.push({ symbol: instrument.symbol, success: true });

      } catch (err) {
        console.error(`✗ ${instrument.symbol} error:`, err.message);
        results.push({
          symbol: instrument.symbol,
          success: false,
          error: err.message,
        });
      }
    }

    client.release();

    return res.json({
      success: true,
      message: "Market data insert completed",
      results,
    });

  } catch (err) {
    console.error("Insert Error:", err.message);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};
