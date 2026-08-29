const { Pool } = require('pg');

// PostgreSQL bazasiga ulanish sozlamalari (.env.local dan o'qiladi).
// Dev rejimida hot-reload paytida yangi-yangi pool ochilib ketmasligi uchun
// global obyektga saqlab qo'yamiz.
const globalForPool = global;

const host = process.env.DB_HOST || 'localhost';
const port = Number(process.env.DB_PORT) || 5432;
const database = process.env.DB_NAME;

// Neon / Vercel Postgres / Supabase kabi bulutli bazalar SSL talab qiladi —
// aks holda ulanish "28000: connection is insecure (try using `sslmode=require`)"
// xatosi bilan rad etiladi. Localhost esa odatda SSL'siz ishlaydi.
// Kerak bo'lsa DB_SSL=true|false bilan qo'lda majburlash mumkin.
function resolveSsl() {
  const flag = (process.env.DB_SSL || '').trim().toLowerCase();
  if (['false', '0', 'disable', 'off'].includes(flag)) return false;
  if (['true', '1', 'require', 'on'].includes(flag)) return { rejectUnauthorized: false };

  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1';
  return isLocal ? false : { rejectUnauthorized: false };
}

const ssl = resolveSsl();

const pool =
  globalForPool.__pgPool ||
  new Pool({
    user: process.env.DB_USER,
    host,
    database,
    password: process.env.DB_PASSWORD,
    port,
    ssl,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPool.__pgPool = pool;
}

// Bo'sh turgan ulanish uzilib qolsa process yiqilmasin (Neon ulanishni uzib qo'yadi).
if (!globalForPool.__pgErrorHandlerAttached) {
  globalForPool.__pgErrorHandlerAttached = true;
  pool.on('error', (err) => console.error('[DB] Pool xatosi:', err.message));
}

// Bazaga ulanib ko'radi va terminalga tushunarli holat yozadi.
// instrumentation-node.js server ko'tarilganda shuni chaqiradi.
async function checkConnection() {
  const where = `${database} @ ${host}:${port} (user: ${process.env.DB_USER}, SSL: ${ssl ? 'yoqilgan' : "o'chirilgan"})`;
  try {
    const { rows } = await pool.query('SELECT current_database() AS db, version() AS v');
    const version = String(rows[0].v).split(',')[0];
    console.log(`[DB] ✅ PostgreSQL'ga ULANDI -> ${where}`);
    console.log(`[DB]    ${version}`);
    return { ok: true };
  } catch (err) {
    console.error(`[DB] ❌ PostgreSQL'ga ULANIB BO'LMADI -> ${where}`);
    console.error(`[DB]    Sabab: ${describeDbError(err)}`);
    if (err.code === '28000' && !ssl) {
      console.error('[DB]    Maslahat: .env.local ga DB_SSL=true qo\'shing.');
    }
    return { ok: false, error: err };
  }
}

// Node ECONNREFUSED'ni AggregateError sifatida qaytaradi va uning message'i
// bo'm-bo'sh bo'ladi ({"error":""}). Shuning uchun xatoni o'zimiz yozamiz.
function describeDbError(err) {
  if (!err) return 'Noma’lum xato';
  if (err.message) return err.code ? `${err.code}: ${err.message}` : err.message;
  if (Array.isArray(err.errors) && err.errors.length) {
    const inner = err.errors.map((e) => e.code || e.message).filter(Boolean).join(', ');
    return `Bazaga ulanib bo'lmadi (${host}:${port}) — ${inner || err.name}`;
  }
  return `${err.name || 'Error'} (${host}:${port})`;
}

module.exports = pool;
module.exports.checkConnection = checkConnection;
module.exports.describeDbError = describeDbError;
