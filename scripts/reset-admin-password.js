// Admin parolini bcrypt hash bilan qayta o'rnatadi.
//
//   npm run admin:reset                     -> admin / 12345
//   npm run admin:reset -- <login> <parol>  -> boshqa login/parol
//
// Parolni unutib qolganda yoki bazadagi parol boshqa formatda (eski sha256,
// ochiq matn va h.k.) saqlangan bo'lib, tizimga kirib bo'lmay qolganda kerak.
const path = require('node:path');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// Next.js'siz ishga tushgani uchun .env fayllarini o'zimiz o'qiymiz.
require('node:fs')
  .readdirSync(process.cwd())
  .filter((f) => f === '.env' || f.startsWith('.env.'))
  .forEach((f) => {
    for (const line of require('node:fs').readFileSync(path.join(process.cwd(), f), 'utf8').split(/\r?\n/)) {
      const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  });

const username = process.argv[2] || 'admin';
const plain = process.argv[3] || '12345';

const host = process.env.DB_HOST || 'localhost';
const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1';

const pool = new Pool({
  user: process.env.DB_USER,
  host,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT) || 5432,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

(async () => {
  try {
    const hashed = await bcrypt.hash(plain, 10);
    const { rows } = await pool.query(
      `UPDATE admin SET password = $1, is_active = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE username = $2
       RETURNING id, username, type, is_active`,
      [hashed, username]
    );

    if (rows.length === 0) {
      console.error(`❌ "${username}" nomli admin topilmadi.`);
      process.exitCode = 1;
      return;
    }

    console.log(`✅ Parol yangilandi -> login: ${rows[0].username}, parol: ${plain}`);
    console.log('   Bazada bcrypt hash sifatida saqlandi.');
  } catch (err) {
    console.error('❌ Xato:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
