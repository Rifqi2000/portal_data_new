const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD || ""), // ✅ pastikan string
  database: process.env.DB_NAME,
});

pool.on("connect", (client) => {
  const schema = process.env.DB_SCHEMA || "public";
  client.query(`SET search_path TO ${schema}, public`);
});

module.exports = { pool };
