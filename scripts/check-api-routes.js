// Frontenddan chaqirilayotgan har bir API yo'li uchun mos Next.js route fayli
// bor-yo'qligini tekshiradi. Papka nomi noto'g'ri yozilganda (masalan
// bola_kuni_all / bola_kun_all) so'rov 404 qaytaradi — buni build paytida emas,
// faqat foydalanuvchi sahifani ochganda bilinadi. Shu skript oldindan topadi.
//
// Ishga tushirish: node scripts/check-api-routes.js
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const API_DIR = path.join(ROOT, 'src', 'pages', 'api');
const SCAN_DIRS = [path.join(ROOT, 'src', 'pages'), path.join(ROOT, 'src', 'components')];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(js|jsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

// Mavjud route'larni segment daraxti sifatida yig'amiz ([id] kabi dinamik
// segmentlar har qanday qiymatga mos keladi).
function collectRoutes(dir, prefix = []) {
  const routes = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      routes.push(...collectRoutes(path.join(dir, entry.name), [...prefix, entry.name]));
    } else if (/\.(js|jsx)$/.test(entry.name)) {
      const base = entry.name.replace(/\.(js|jsx)$/, '');
      routes.push(base === 'index' ? prefix : [...prefix, base]);
    }
  }
  return routes;
}

const routes = collectRoutes(API_DIR);
const isDynamic = (seg) => seg.startsWith('[');

function matches(callSegs) {
  return routes.some((r) => {
    // [...slug] catch-all
    const catchAll = r.length > 0 && r[r.length - 1].startsWith('[...');
    if (catchAll) {
      if (callSegs.length < r.length - 1) return false;
    } else if (r.length !== callSegs.length) {
      return false;
    }
    return r.every((seg, i) => {
      if (seg.startsWith('[...')) return true;
      if (isDynamic(seg)) return true;
      return seg === callSegs[i];
    });
  });
}

// `${url}/xxx/yyy` ko'rinishidagi chaqiruvlar va bare '/xxx' (axios baseURL bilan).
const CALL_RE = /\$\{url\}(\/[A-Za-z0-9_\-/${}.?=&\[\]]*)/g;
const problems = [];
const seen = new Set();

for (const dir of SCAN_DIRS) {
  for (const file of walk(dir)) {
    if (file.includes(path.join('pages', 'api'))) continue;
    const src = fs.readFileSync(file, 'utf8');

    for (const m of src.matchAll(CALL_RE)) {
      const raw = m[1].split('?')[0];
      // Shablon o'rinlari (${id}) dinamik segment sifatida qaraladi.
      const segs = raw
        .split('/')
        .filter(Boolean)
        .map((s) => (s.includes('${') ? '[dyn]' : s));

      if (segs.length === 0) continue;
      // Faqat statik qismi noaniq bo'lmagan yo'llarni tekshiramiz.
      if (segs.every((s) => s === '[dyn]')) continue;

      const key = segs.join('/');
      if (seen.has(key)) continue;
      seen.add(key);

      const callSegs = segs.map((s) => (s === '[dyn]' ? '__DYN__' : s));
      const ok = routes.some((r) => {
        if (r.length !== callSegs.length) return false;
        return r.every((seg, i) => isDynamic(seg) || callSegs[i] === '__DYN__' || seg === callSegs[i]);
      });

      if (!ok) problems.push({ file: path.relative(ROOT, file), route: '/' + key });
    }
  }
}

if (problems.length > 0) {
  console.error(`Mos route topilmadi (${problems.length}):\n`);
  for (const p of problems) console.error(`  ${p.route}\n      ${p.file}`);
  process.exit(1);
}

console.log(`OK — ${seen.size} ta chaqiruv, hammasi mavjud route'ga mos (${routes.length} route).`);
