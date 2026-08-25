// Tarjimalarni tekshiradi:
//   1) bitta til ichida takrorlangan kalit (keyingisi avvalgisini jimgina bosib ketadi)
//   2) uz/ru/en o'rtasida yetishmayotgan kalitlar
//
// Ishga tushirish: node scripts/check-i18n.js
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'src', 'i18n', 'translations.js');
const src = fs.readFileSync(FILE, 'utf8');

const LANGS = ['uz', 'ru', 'en'];
let hasProblem = false;

// Har bir til blokining chegarasini topamiz.
const bounds = LANGS.map((lang) => ({ lang, start: src.indexOf(`\n  ${lang}: {`) }));
bounds.forEach((b, i) => {
  b.end = i + 1 < bounds.length ? bounds[i + 1].start : src.length;
});

const keysByLang = {};

for (const { lang, start, end } of bounds) {
  if (start === -1) {
    console.error(`XATO: "${lang}" bloki topilmadi`);
    hasProblem = true;
    continue;
  }

  const block = src.slice(start, end);
  const seen = new Set();
  const dups = new Set();

  for (const m of block.matchAll(/^    ([A-Za-z_][A-Za-z0-9_]*):/gm)) {
    const key = m[1];
    if (seen.has(key)) dups.add(key);
    seen.add(key);
  }

  keysByLang[lang] = seen;

  if (dups.size > 0) {
    hasProblem = true;
    console.error(`\n[${lang}] takrorlangan kalit (${dups.size}):`);
    for (const k of dups) console.error(`  - ${k}`);
  }
}

const all = new Set(LANGS.flatMap((l) => [...(keysByLang[l] || [])]));
for (const lang of LANGS) {
  const missing = [...all].filter((k) => !keysByLang[lang]?.has(k));
  if (missing.length > 0) {
    hasProblem = true;
    console.error(`\n[${lang}] yetishmayotgan kalit (${missing.length}):`);
    for (const k of missing) console.error(`  - ${k}`);
  }
}

if (!hasProblem) {
  console.log(`OK — ${all.size} ta kalit, uz/ru/en to‘liq mos.`);
}
process.exit(hasProblem ? 1 : 0);
