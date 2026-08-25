// Yangi tarjima kalitlarini uz/ru/en bloklariga bir yo'la qo'shadi.
//
// Ishlatish:
//   node scripts/add-i18n-keys.js keys.json
// keys.json ko'rinishi:
//   { "editStudent": { "uz": "...", "ru": "...", "en": "..." }, ... }
//
// Allaqachon mavjud kalit qayta qo'shilmaydi (o'tkazib yuboriladi).
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'src', 'i18n', 'translations.js');
const input = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const LANGS = ['uz', 'ru', 'en'];

let src = fs.readFileSync(FILE, 'utf8');
const added = [];
const skipped = [];

for (const lang of LANGS) {
  const start = src.indexOf(`\n  ${lang}: {`);
  if (start === -1) throw new Error(`"${lang}" bloki topilmadi`);

  // Blok oxiri: shu blokdan keyingi birinchi "\n  }," yoki "\n  }".
  const closeRel = src.slice(start).search(/\n {2}\}/);
  if (closeRel === -1) throw new Error(`"${lang}" blokining yopilishi topilmadi`);
  const close = start + closeRel;

  const block = src.slice(start, close);
  const lines = [];

  for (const [key, values] of Object.entries(input)) {
    if (new RegExp(`^ {4}${key}:`, 'm').test(block)) {
      if (lang === 'uz') skipped.push(key);
      continue;
    }
    const text = values[lang];
    if (text === undefined) throw new Error(`"${key}" uchun "${lang}" tarjimasi yo'q`);
    lines.push(`    ${key}: ${JSON.stringify(text)},`);
    if (lang === 'uz') added.push(key);
  }

  if (lines.length === 0) continue;

  // Oxirgi kalitdan keyin vergul bo'lmasligi mumkin — qo'shib qo'yamiz.
  let head = src.slice(0, close).replace(/,?\s*$/, ',\n');
  src = head + lines.join('\n') + src.slice(close);
}

fs.writeFileSync(FILE, src, 'utf8');
console.log(`Qo'shildi: ${added.length} ta kalit`);
if (skipped.length) console.log(`Allaqachon bor edi: ${skipped.join(', ')}`);
