const bcrypt = require('bcryptjs');
const pool = require('./db');

// Parollar bazada ochiq matnda emas, bcrypt hash ko'rinishida saqlanadi.
// Hash uzunligi doim 60 belgi ($2a$/$2b$ bilan boshlanadi) — admin.password
// ustuni VARCHAR(255), sig'adi.
const SALT_ROUNDS = 10;

// Eski (hashlanmagan) parollarni ajratish uchun. Bazada avvaldan ochiq matnda
// yozilgan parollar bo'lishi mumkin — ular login paytida jimgina hashga
// o'tkaziladi (pastdagi verifyPassword'ga qarang).
function isHashed(value) {
  return typeof value === 'string' && /^\$2[aby]\$\d{2}\$/.test(value);
}

async function hashPassword(plain) {
  if (typeof plain !== 'string' || plain.length === 0) {
    throw new Error('Parol bo\u2018sh bo\u2018lishi mumkin emas');
  }
  // Allaqachon hash bo'lsa (masalan ikki marta chaqirilsa) qayta hashlamaymiz.
  if (isHashed(plain)) return plain;
  return bcrypt.hash(plain, SALT_ROUNDS);
}

// Kiritilgan parolni bazadagi qiymat bilan solishtiradi.
// Eski ochiq matnli parol bo'lsa ham to'g'ri ishlaydi.
async function verifyPassword(plain, stored) {
  if (typeof plain !== 'string' || typeof stored !== 'string') return false;
  if (isHashed(stored)) return bcrypt.compare(plain, stored);
  // Legacy: ochiq matn. Vaqt bo'yicha hujum bu yerda muhim emas, chunki
  // muvaffaqiyatli tekshiruvdan keyin qiymat darhol hashga almashtiriladi.
  return plain === stored;
}

// Login muvaffaqiyatli bo'lgach, hali hashlanmagan parolni bazada hashga
// almashtiradi. Xato bo'lsa loginni buzmaydi — faqat logga yozadi.
async function upgradeLegacyPassword(adminId, stored, plain) {
  if (isHashed(stored)) return;
  try {
    const hashed = await hashPassword(plain);
    await pool.query('UPDATE admin SET password = $1 WHERE id = $2', [hashed, adminId]);
    console.log(`[auth] Admin #${adminId} paroli bcrypt hashga o\u2018tkazildi.`);
  } catch (err) {
    console.error('[auth] Parolni hashga o\u2018tkazishda xato:', err.message);
  }
}

module.exports = { hashPassword, verifyPassword, isHashed, upgradeLegacyPassword, SALT_ROUNDS };
