const { pool } = require("../../db");

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

export const insertDataController = async (req, res) => {
  try {
    console.log("Starting currency data insertion...");
    const results = [];
    let requestCount = 0;

    for (const symbol of currencyOptions) {
      if (requestCount === 8) {
        console.log("Rate limit reached. Waiting 60 seconds...");
        await sleep(60000);
        requestCount = 0;
      }

      console.log(`Fetching data for ${symbol}...`);
      const response = await fetch(
        `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1day&outputsize=180&apikey=719132ad329042159b7a5c4422639e1a`,
      );
      const data = await response.json();
      requestCount++;

      if (data.status === "ok") {
        const client = await pool.connect();
        await client.query(
          "INSERT INTO currency_timeseries (meta, values) VALUES ($1, $2)",
          [JSON.stringify(data.meta), JSON.stringify(data.values)],
        );
        client.release();
        console.log(`✓ ${symbol} inserted successfully`);
        results.push({ symbol, success: true });
      } else {
        console.log(`✗ ${symbol} failed: ${data.message}`);
        results.push({ symbol, success: false, error: data.message });
      }
    }

    console.log("All currencies processed.");
    return res.json({ success: true, results });
  } catch (err) {
    console.error("Error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getDataController = async (req, res) => {
  try {
    const { days } = req.query;
    const client = await pool.connect();
    const result = await client.query("SELECT * FROM currency_timeseries");
    client.release();

    const data = result.rows.map((row) => {
      const parsedValues = JSON.parse(row.values);

      if (days) {
        const daysCount = parseInt(days.replace("D", ""));
        const filteredValues = parsedValues.slice(0, daysCount);

        return {
          ...row,
          meta: JSON.parse(row.meta),
          values: filteredValues,
        };
      }

      return {
        ...row,
        meta: JSON.parse(row.meta),
        values: parsedValues,
      };
    });

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
