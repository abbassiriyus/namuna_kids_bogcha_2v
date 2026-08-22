// Xodimning bugungi davomatiga qarab "kayfiyat" stikerini tanlaydi.
// Stiker rejadagi vaqtdan qancha chetlashganiga qarab bosqichma-bosqich
// o'zgaradi: vaqtida kelib to'liq ishlagan xodimda quvnoq, juda kech kelgan
// yoki juda erta ketganda o'ta jahldor stiker chiqadi.

// Kechikish (min) -> stikerlar. Har bosqichda bir nechta variant bor, ular
// xodim id'si bo'yicha barqaror tanlanadi (har renderda sakramasligi uchun).
const MOOD_LEVELS = [
  { maxScore: 0,   label: 'Zo‘r!',            stickers: ['🤩', '😄', '🥳', '😎', '🌟', '🏆', '💯', '🚀', '✨', '🙌'] },
  { maxScore: 10,  label: 'Yaxshi',           stickers: ['🙂', '😊', '👍', '😌', '🌤️', '👌', '😇'] },
  { maxScore: 25,  label: 'O‘rtacha',         stickers: ['😐', '🤔', '😶', '🫤', '⏳', '😑'] },
  { maxScore: 45,  label: 'Yaxshi emas',      stickers: ['🙁', '😕', '😟', '😬', '⚠️', '😮‍💨'] },
  { maxScore: 70,  label: 'Yomon',            stickers: ['😠', '😧', '😨', '🥵', '😰', '❗'] },
  { maxScore: 100, label: 'Juda yomon',       stickers: ['😡', '🤬', '💢', '🔥', '👿', '😤'] },
  { maxScore: Infinity, label: 'O‘ta jahldor', stickers: ['🤬', '👿', '💀', '☠️', '🌋', '⛔', '💣'] },
];

const NO_SHOW = { sticker: '❌', label: 'Kelmagan', tone: 'bad' };
const IN_PROGRESS = { sticker: '🔵', label: 'Ish jarayonida', tone: 'neutral' };

// "HH:mm[:ss]" -> minutlar. Noto'g'ri qiymatda null.
function toMinutes(time) {
  if (!time || typeof time !== 'string') return null;
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

/**
 * Bugungi davomat bo'yicha kechikish/erta ketishni hisoblaydi va stiker beradi.
 * @param {object} p
 * @param {string|null} p.startTime   haqiqiy kelgan vaqt "HH:mm:ss"
 * @param {string|null} p.endTime     haqiqiy ketgan vaqt "HH:mm:ss"
 * @param {string|null} p.planStart   rejadagi kelish vaqti
 * @param {string|null} p.planEnd     rejadagi ketish vaqti
 * @param {number} p.seed             stiker tanlashda barqarorlik uchun (xodim id)
 */
export function getDavomatMood({ startTime, endTime, planStart, planEnd, seed = 0 }) {
  const actualStart = toMinutes(startTime);
  const actualEnd = toMinutes(endTime);
  const expectedStart = toMinutes(planStart);
  const expectedEnd = toMinutes(planEnd);

  if (actualStart === null) {
    return { ...NO_SHOW, kechikish: 0, ertaKetish: 0 };
  }

  // Rejadan kechikkan minutlar (erta kelgan bo'lsa 0).
  const kechikish = expectedStart !== null ? Math.max(actualStart - expectedStart, 0) : 0;
  // Rejadan erta ketgan minutlar (hali ketmagan bo'lsa hisoblanmaydi).
  const ertaKetish =
    actualEnd !== null && expectedEnd !== null ? Math.max(expectedEnd - actualEnd, 0) : 0;

  if (actualEnd === null) {
    // Hali ishda — kechikish bo'yicha baholaymiz, lekin erta ketishni bilmaymiz.
    const level = pickLevel(kechikish, seed);
    return { ...level, kechikish, ertaKetish: 0, tone: toneFor(kechikish), inProgress: true };
  }

  // Kechikish va erta ketish birgalikda umumiy "jarima ballari"ni beradi.
  const score = kechikish + ertaKetish;
  const level = pickLevel(score, seed);
  return { ...level, kechikish, ertaKetish, tone: toneFor(score) };
}

function pickLevel(score, seed) {
  const level = MOOD_LEVELS.find((l) => score <= l.maxScore) || MOOD_LEVELS[MOOD_LEVELS.length - 1];
  const sticker = level.stickers[Math.abs(seed) % level.stickers.length];
  return { sticker, label: level.label };
}

function toneFor(score) {
  if (score <= 0) return 'great';
  if (score <= 10) return 'good';
  if (score <= 25) return 'neutral';
  if (score <= 45) return 'warn';
  return 'bad';
}

/** Minutlarni "1 soat 20 min" ko'rinishida yozadi. */
export function formatMinutes(minutes) {
  if (!minutes || minutes <= 0) return '-';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h > 0) return `${h} soat ${m} min`;
  return `${m} min`;
}

export { IN_PROGRESS };
