// Faqat Node.js runtime'da ishga tushadi (src/instrumentation.js orqali).
// Ikkita narsani o'zi tekshirib, kerak bo'lsa tuzatadi:
//
//   1) Loyiha uchun kerakli har bir jadval bazada bor-yo'qligini tekshiradi.
//      Barchasi joyida bo'lsa — hech narsaga tegmay, loyiha shunchaki ishlayveradi.
//      Biror jadval yetishmasa — db/schema.sql'ni ishga tushiradi (u endi har bir
//      CREATE TABLE'da IF NOT EXISTS ishlatadi, shuning uchun mavjud jadvallarga
//      tegmay, faqat yetishmayotganlarini va ularga tegishli indeks/ruxsatlarni
//      yaratadi). schema.sql ichidagi GRANT'lar qattiq "abbasuz3_user" nomiga
//      bog'langan edi — buni haqiqiy DB_USER'ga almashtiramiz, shunda boshqa
//      muhitda boshqa DB_USER bilan ham xatosiz ishlaydi.
//   2) "admin" nomli foydalanuvchi bo'lmasa — standart admin (login: admin,
//      parol: 12345) yaratadi, aks holda tizimga kiradigan hech kim qolmaydi.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import pool from './lib/db.js';

async function ensureSchema() {
  const schemaPath = join(process.cwd(), 'db', 'schema.sql');
  let sql = readFileSync(schemaPath, 'utf8');

  // schema.sql'dagi har bir "CREATE TABLE IF NOT EXISTS <nom>" dan kerakli
  // jadvallar ro'yxatini o'zidan chiqarib olamiz — shu bilan ro'yxat qo'lda
  // yozilgan holda schema.sql'dan chetga chiqib eskirmaydi.
  const requiredTables = [...sql.matchAll(/CREATE TABLE IF NOT EXISTS\s+([a-zA-Z_][a-zA-Z0-9_]*)/g)].map(
    (m) => m[1]
  );

  const { rows } = await pool.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = ANY($1)`,
    [requiredTables]
  );
  const existing = new Set(rows.map((r) => r.table_name));
  const missing = requiredTables.filter((t) => !existing.has(t));

  if (missing.length === 0) return; // hammasi joyida — tegmaymiz

  const dbUser = process.env.DB_USER;
  if (dbUser) {
    sql = sql.split('abbasuz3_user').join(dbUser);
  }

  await pool.query(sql);
  console.log(
    `[instrumentation] Yetishmayotgan jadvallar topildi va yaratildi: ${missing.join(', ')}`
  );
}

async function ensureDefaultAdmin() {
  const { rows } = await pool.query('SELECT id FROM admin WHERE username = $1 LIMIT 1', ['admin']);
  if (rows.length > 0) return;

  await pool.query(
    `INSERT INTO admin (username, phone_number, type, description, is_active, password)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    ['admin', '+998000000000', 1, "Standart admin (tizim tomonidan avtomatik yaratildi)", true, '12345']
  );
  console.log(
    "[instrumentation] Admin topilmadi — standart admin yaratildi (login: admin, parol: 12345). Xavfsizlik uchun birinchi kirishdan so'ng parolni albatta almashtiring."
  );
}

try {
  await ensureSchema();
} catch (err) {
  console.error('[instrumentation] Baza sxemasini yaratishda xato:', err.message);
}

try {
  await ensureDefaultAdmin();
} catch (err) {
  console.error('[instrumentation] Admin mavjudligini tekshirishda xato:', err.message);
}
