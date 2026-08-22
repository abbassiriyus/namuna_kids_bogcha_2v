// Butun loyiha uchun yagona sana hisoblash qoidasi.
//
// Muammo: ko'p joyda `new Date().toISOString().slice(0, 10)` ishlatilgan edi.
// `toISOString()` sanani UTC'ga o'giradi, Toshkent esa UTC+5 — shu sababli
// soat 05:00 dan oldin (va bazadan kelgan DATE qiymatlari uchun doim) sana bir
// kunga orqaga surilib ketardi. "Bola kuni" sahifasi to'g'ri ishlagani ham
// shundan: u `toLocaleDateString('sv-SE')` — ya'ni mahalliy sanani ishlatadi.
//
// Shu sababli hamma joyda mahalliy kalendar sanasi ishlatiladi.
// 'sv-SE' lokali "YYYY-MM-DD" formatini beradi.

/** Berilgan sanani mahalliy "YYYY-MM-DD" ko'rinishida qaytaradi. */
export function toLocalDate(value = new Date()) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('sv-SE');
}

/** Bugungi mahalliy sana, "YYYY-MM-DD". */
export function bugungiSana() {
  return toLocalDate(new Date());
}

/** Berilgan sananing oyi, mahalliy "YYYY-MM". */
export function toLocalMonth(value = new Date()) {
  return toLocalDate(value).slice(0, 7);
}

/** Joriy oy, mahalliy "YYYY-MM". */
export function bugungiOy() {
  return toLocalMonth(new Date());
}

/** Sanaga kun qo'shadi va mahalliy "YYYY-MM-DD" qaytaradi. */
export function addDays(value, days) {
  const d = value instanceof Date ? new Date(value) : new Date(value);
  d.setDate(d.getDate() + days);
  return toLocalDate(d);
}
