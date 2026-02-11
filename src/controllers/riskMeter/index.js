const { pool } = require("../../db");

const calculateRisk = (values, meta) => {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error("Invalid data");
  }

  const candle = values[0];
  const open = Number(candle.open);
  const close = Number(candle.close);

  if (isNaN(open) || isNaN(close) || open === 0) {
    throw new Error("Invalid candle prices");
  }

  const percentChange = ((close - open) / open) * 100;

  let normalizedRisk = 50 + percentChange * 20;
  normalizedRisk = Math.max(0, Math.min(100, normalizedRisk));

  let zone;
  if (normalizedRisk >= 65) zone = "STRONG_RISK_ON";
  else if (normalizedRisk >= 50) zone = "WEAK_RISK_ON";
  else if (normalizedRisk > 35) zone = "WEAK_RISK_OFF";
  else zone = "STRONG_RISK_OFF";

  return {
    symbol: meta.symbol,
    interval: meta.interval,
    datetime: candle.datetime,
    percentChange: Number(percentChange.toFixed(4)),
    normalizedRisk: Number(normalizedRisk.toFixed(2)),
    zone,
  };
};

export const riskMeterController = async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query("SELECT * FROM currency_timeseries");
    client.release();

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "No currency data found" });
    }

    const riskData = result.rows.map((row) => {
      const meta = JSON.parse(row.meta);
      const values = JSON.parse(row.values);
      return calculateRisk(values, meta);
    });

    res.json({ success: true, data: riskData });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
