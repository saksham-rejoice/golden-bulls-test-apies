const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const connectDb = async () => {
  try {
    const client = await pool.connect();
    return client;
  } catch (err) {
    console.error('Database connection error:', err.message);
    console.error('Full error:', err);
    throw new Error(`Database connection failed: ${err.message}`);
  }
};

module.exports = { pool, connectDb };
