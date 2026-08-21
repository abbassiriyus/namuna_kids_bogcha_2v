const { Pool } = require('pg');

// PostgreSQL bazasiga ulanish sozlamalari (backend/.env dan o'qiladi)
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT) || 5432,
});

module.exports = pool;
