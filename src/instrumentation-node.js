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
//   2) admin jadvali bo‘m-bo‘sh bo‘lsa (0 ta admin) — standart admin (login: admin,
//      parol: 12345) yaratadi, aks holda tizimga kiradigan hech kim qolmaydi.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import pool, { checkConnection } from './lib/db.js';
import { hashPassword } from './lib/password.js';

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
    // Identifikatorni qo'shtirnoqqa olamiz: DB_USER "default" kabi SQL'da
    // zahiralangan so'z bo'lsa, tirnoqsiz GRANT sintaksis xatosi beradi.
    const quoted = '"' + dbUser.replace(/"/g, '""') + '"';
    sql = sql.split('abbasuz3_user').join(quoted);
  }

  await pool.query(sql);
  console.log(
    `[instrumentation] Yetishmayotgan jadvallar topildi va yaratildi: ${missing.join(', ')}`
  );
}

// Standart admin ma'lumotlari — kerak bo'lsa .env orqali o'zgartiriladi.
const DEFAULT_ADMIN_USERNAME = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || '12345';
const DEFAULT_ADMIN_PHONE = process.env.DEFAULT_ADMIN_PHONE || '+998000000000';

async function ensureDefaultAdmin() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS c FROM admin');
  if (rows[0].c > 0) return; // adminlar bor — tegmaymiz

  // Parol ochiq matnda emas, bcrypt hash ko'rinishida yoziladi.
  await pool.query(
    `INSERT INTO admin (username, phone_number, type, description, is_active, password)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      DEFAULT_ADMIN_USERNAME,
      DEFAULT_ADMIN_PHONE,
      1,
      'Standart admin (tizim tomonidan avtomatik yaratildi)',
      true,
      await hashPassword(DEFAULT_ADMIN_PASSWORD),
    ]
  );
  console.log(
    `[instrumentation] Admin jadvali bo'sh edi — standart admin yaratildi (login: ${DEFAULT_ADMIN_USERNAME}, parol: ${DEFAULT_ADMIN_PASSWORD}). Xavfsizlik uchun birinchi kirishdan so'ng parolni albatta almashtiring.`
  );
}

console.log('[server] 🚀 Backend ishga tushdi (Next.js API routes: /api)');

// 0) Avval bazaga ulanamiz va natijani terminalga yozamiz. Ulanmasa — keyingi
//    qadamlarni bajarishning ma’nosi yo’q, xatolar to‘planib ketmasin.
const { ok } = await checkConnection();

if (ok) {
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
} else {
  console.error('[instrumentation] Bazaga ulanib bo’lmagani uchun sxema va admin tekshiruvi o’tkazilmadi.');
}

if (ok) {
  console.log("[server] ✅ Backend tayyor — API so'rovlarini qabul qilishga shay.");
} else {
  console.error("[server] ⚠️  Backend ishlayapti, lekin BAZASIZ — API so'rovlari xato qaytaradi.");
}
