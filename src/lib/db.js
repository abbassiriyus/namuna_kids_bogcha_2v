const { Pool } = require('pg');

// PostgreSQL bazasiga ulanish sozlamalari (.env.local dan o'qiladi).
// Dev rejimida hot-reload paytida yangi-yangi pool ochilib ketmasligi uchun
// global obyektga saqlab qo'yamiz.
const globalForPool = global;

const pool =
  globalForPool.__pgPool ||
  new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT) || 5432,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPool.__pgPool = pool;
}

module.exports = pool;
