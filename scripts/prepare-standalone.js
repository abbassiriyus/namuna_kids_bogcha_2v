// `next build` (output: 'standalone') faqat server.js + kerakli node_modules'ni
// .next/standalone ichiga yig'adi — public/, .next/static/ va .env fayllarini
// QO'LDA qo'shish kerak (Next.js buni build vaqtida o'zi qilmaydi). Shu skript
// aynan shu qadamlarni bajaradi, natijada .next/standalone papkasini serverga
// ko'chirib, `node server.js` bilan ishga tushirsa bo'ladi.

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const standaloneDir = path.join(root, '.next', 'standalone');

function fail(message) {
  console.error(`\n✗ ${message}`);
  process.exit(1);
}

if (!fs.existsSync(standaloneDir)) {
  fail("'.next/standalone' topilmadi. Avval `npm run build` ishga tushiring.");
}

function copyDir(src, dest, label) {
  if (!fs.existsSync(src)) {
    console.warn(`  (o'tkazib yuborildi — topilmadi: ${label})`);
    return;
  }
  fs.cpSync(src, dest, { recursive: true, force: true });
  console.log(`  ✓ ${label} nusxalandi`);
}

console.log('Standalone build\'ga qo\'shilmoqda:');

// 1) Statik frontend fayllar (rasm, css, js chunk'lar) — build vaqtida
//    standalone'ga kirmaydi, qo'lda qo'shiladi.
copyDir(path.join(root, 'public'), path.join(standaloneDir, 'public'), 'public/');
copyDir(
  path.join(root, '.next', 'static'),
  path.join(standaloneDir, '.next', 'static'),
  '.next/static/'
);

// 2) Server env o'zgaruvchilari (DB_*, JWT_SECRET). Production uchun alohida
//    fayl bo'lsa o'shani, bo'lmasa .env.local'ni ishlatadi (shu holda ogohlantiradi).
const envCandidates = ['.env.production.local', '.env.production', '.env.local'];
const envSource = envCandidates.map((f) => path.join(root, f)).find(fs.existsSync);

if (envSource) {
  fs.copyFileSync(envSource, path.join(standaloneDir, '.env'));
  console.log(`  ✓ ${path.basename(envSource)} -> .env sifatida nusxalandi`);
  if (path.basename(envSource) === '.env.local') {
    console.warn(
      '  ! .env.production(.local) topilmadi, dev uchun mo\'ljallangan .env.local ishlatildi.\n' +
      '    Productionda haqiqiy DB ma\'lumotlari bilan .env.production.local yarating.'
    );
  }
} else {
  console.warn('  ! Hech qanday .env fayl topilmadi — DB_*/JWT_SECRET serverda qo\'lda sozlanishi kerak.');
}

// 3) Yuklangan fayllar (xodim rasmlari) uchun papka. server.js ishga tushganda
//    process.chdir(__dirname) qiladi, shuning uchun uploads shu papka ichida
//    bo'lishi kerak. MUHIM: keyingi deploy'larda bu papkani ustidan yozib
//    yubormang — mavjud fayllar shu yerda saqlanadi.
const uploadsDir = path.join(standaloneDir, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('  ✓ uploads/ papkasi yaratildi (bo\'sh)');
} else {
  console.log('  (uploads/ allaqachon mavjud — tegilmadi)');
}

console.log(`\n✓ Tayyor: ${standaloneDir}`);
console.log('  Serverda ishga tushirish: node server.js  (PORT va HOSTNAME env orqali sozlanadi)');
