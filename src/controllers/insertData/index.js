const { connectDb } = require("../../db");
import { currencyOptions } from "../../constants";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const apiKeys = [
  process.env.TWELVEDATA_API_KEY1,
  process.env.TWELVEDATA_API_KEY2,
  process.env.TWELVEDATA_API_KEY3,
].filter(Boolean);

const fetchWithFallback = async (url) => {
  const separator = url.includes("?") ? "&" : "?";

  for (let i = 0; i < apiKeys.length; i++) {
    const key = apiKeys[i];

    try {
      console.log(`Trying key ${i + 1}...`);
      const response = await fetch(`${url}${separator}apikey=${key}`);

      if (response.status === 429) {
        console.log(`Key ${i + 1} rate limited.`);
        continue;
      }

      const data = await response.json();

      if (data.message?.toLowerCase().includes("limit")) {
        console.log(`Key ${i + 1} credits exhausted.`);
        continue;
      }

      console.log(`Key ${i + 1} succeeded.`);
      return data;
    } catch (error) {
      console.log(`Key ${i + 1} network failed:`, error);
      continue;
    }
  }

  throw new Error("All API keys exhausted.");
};

export const updateCurrencyData = async () => {
  try {
    console.log("Starting currency data update...");
    const results = [];
    let requestCount = 0;

    for (const symbol of currencyOptions) {
      if (requestCount === 8) {
        console.log("Rate limit reached. Waiting 60 seconds...");
        await sleep(60000);
        requestCount = 0;
      }

      console.log(`Fetching data for ${symbol}...`);
      const data = await fetchWithFallback(
        `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1day&outputsize=180`,
      );
      requestCount++;

      if (data.status === "ok") {
        const client = await connectDb();
        await client.query(
          "UPDATE currency_timeseries SET meta = $1, values = $2 WHERE currency = $3",
          [JSON.stringify(data.meta), JSON.stringify(data.values), symbol],
        );
        client.release();
        console.log(`✓ ${symbol} updated successfully`);
        results.push({ symbol, success: true });
      } else {
        console.log(`✗ ${symbol} failed: ${data.message}`);
        results.push({ symbol, success: false, error: data.message });
      }
    }

    console.log("All currencies updated.");
    return { success: true, results };
  } catch (err) {
    console.error("Error:", err.message);
    console.error("Full error:", err);
    return { success: false, error: err.message };
  }
};

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
      const data = await fetchWithFallback(
        `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1day&outputsize=180`,
      );
      requestCount++;

      if (data.status === "ok") {
        const client = await connectDb();
        await client.query(
          "INSERT INTO currency_timeseries (currency, meta, values) VALUES ($1, $2, $3)",
          [symbol, JSON.stringify(data.meta), JSON.stringify(data.values)],
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
    console.error("Full error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getDataController = async (req, res) => {
  try {
    const { days } = req.query;
    const client = await connectDb();
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

    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
