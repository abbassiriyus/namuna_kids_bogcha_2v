// Oy bo'yicha filtrlash uchun SQL shartlari.
//
// Nega kerak: `TO_CHAR(sana, 'YYYY-MM') = $1` ko'rinishidagi shart ustun
// ustidan funksiya chaqiradi, shuning uchun PostgreSQL indeksdan foydalana
// olmaydi va butun jadvalni o'qiydi. Xuddi shu shartni oraliq ko'rinishida
// yozsak (`sana >= ... AND sana < ...`) indeks ishlaydi.
//
// Ikki xil ustun turi bor va ular boshqacha ishlanadi:
//   * `date`        — vaqt mintaqasi umuman qatnashmaydi
//   * `timestamptz` — chegara qaysi mintaqada hisoblanishi muhim. Baza GMT'da
//                     ishlaydi, foydalanuvchilar esa Toshkentda: 1-sentabr
//                     soat 03:00 da yaratilgan yozuv UTC bo'yicha hali
//                     31-avgust bo'lib, avgust hisobotiga tushib qolardi.
//                     Shuning uchun chegaralarni APP_TIMEZONE bo'yicha olamiz.

const APP_TIMEZONE = 'Asia/Tashkent';

// "YYYY-MM" formatini tekshiradi. SQL'ga qiymat parametr sifatida ketadi,
// lekin noto'g'ri formatda baza tushunarsiz xato beradi — oldindan to'saylik.
function isMonth(value) {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function isYear(value) {
  return /^\d{4}$/.test(String(value));
}

// `date` turidagi ustun uchun: berilgan oy ichidagi kunlar.
//   monthRangeDate('sana', 1)  ->  "sana >= ... AND sana < ..."   ($1 = '2026-08')
function monthRangeDate(column, paramIndex) {
  const start = `($${paramIndex} || '-01')::date`;
  return `${column} >= ${start} AND ${column} < (${start} + INTERVAL '1 month')`;
}

// `date` turidagi ustun uchun: berilgan oy va undan oldingi hamma narsa
// (eski `TO_CHAR(...) <= $1` shartining o'rnini bosadi).
function monthOrEarlierDate(column, paramIndex) {
  return `${column} < (($${paramIndex} || '-01')::date + INTERVAL '1 month')`;
}

// `timestamptz` turidagi ustun uchun: oy chegaralari Toshkent vaqti bo'yicha.
function monthRangeTimestamptz(column, paramIndex) {
  const start = `(($${paramIndex} || '-01')::timestamp AT TIME ZONE '${APP_TIMEZONE}')`;
  const end = `((($${paramIndex} || '-01')::timestamp + INTERVAL '1 month') AT TIME ZONE '${APP_TIMEZONE}')`;
  return `${column} >= ${start} AND ${column} < ${end}`;
}

// `date` turidagi ustun uchun: butun yil ($n = '2026' yoki 2026).
function yearRangeDate(column, paramIndex) {
  const start = `($${paramIndex}::text || '-01-01')::date`;
  return `${column} >= ${start} AND ${column} < (${start} + INTERVAL '1 year')`;
}

module.exports = {
  APP_TIMEZONE,
  isMonth,
  isYear,
  monthRangeDate,
  monthOrEarlierDate,
  monthRangeTimestamptz,
  yearRangeDate,
};
