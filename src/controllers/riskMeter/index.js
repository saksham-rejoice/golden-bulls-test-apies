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

export const getRiskMeterController = async (req, res) => {
  try {
    const LOOKBACK_DAYS = 5;

    const client = await pool.connect();

    const result = await client.query(
      `
      SELECT
        symbol,
        MAX(CASE WHEN rn = 1 THEN close END) AS latest_close,
        MAX(CASE WHEN rn = $1 THEN close END) AS past_close
      FROM (
        SELECT
          symbol,
          close,
          ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY datetime DESC) rn
        FROM market_daily
      ) t
      WHERE rn IN (1, $1)
      GROUP BY symbol
      `,
      [LOOKBACK_DAYS + 1]
    );

    client.release();

    const INVERT = ["UUP", "VIXY", "XAU/USD"];

    let totalScore = 0;
    let count = 0;

    const assets = result.rows.map(row => {
      const latest = Number(row.latest_close);
      const past = Number(row.past_close);

      if (!latest || !past) return null;

      let percentChange = ((latest - past) / past) * 100;

      if (INVERT.includes(row.symbol)) {
        percentChange = -percentChange;
      }

      let score = 50 + (percentChange * 12);
      score = Math.max(0, Math.min(100, score));

      totalScore += score;
      count++;

      let zone;
      if (score >= 65) zone = "RISK_ON";
      else if (score <= 35) zone = "RISK_OFF";
      else zone = "NEUTRAL";

      return {
        symbol: row.symbol,
        percentChange: Number(percentChange.toFixed(3)),
        score: Number(score.toFixed(2)),
        zone
      };
    }).filter(Boolean);

    const globalScore = count ? totalScore / count : 50;

    let globalZone;
    if (globalScore >= 65) globalZone = "STRONG_RISK_ON";
    else if (globalScore >= 55) globalZone = "RISK_ON";
    else if (globalScore > 45) globalZone = "NEUTRAL";
    else if (globalScore > 35) globalZone = "RISK_OFF";
    else globalZone = "STRONG_RISK_OFF";

    return res.json({
      success: true,
      globalScore: Number(globalScore.toFixed(2)),
      globalZone,
      assets
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
