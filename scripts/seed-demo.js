// Bog'chaning namunaviy ("demo") ma'lumotlari — klientga ko'rsatish uchun
// tizim bo'sh emas, jonli ko'rinsin.
//
//   npm run seed:demo            -> baza bo'sh bo'lsa to'ldiradi
//   npm run seed:demo -- --reset -> avval demo jadvallarni tozalab, qaytadan to'ldiradi
//
// Superadmin (admin/12345) o'chirilmaydi — faqat demo adminlar qo'shiladi.
// Ma'lumot "urug'" (seed) asosida generatsiya qilinadi: har safar bir xil
// natija chiqadi, ya'ni ko'rsatuv paytida kutilmagan farq bo'lmaydi.

const fs = require('node:fs');
const path = require('node:path');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// ---------------------------------------------------------------- env
for (const file of ['.env.local', '.env.production.local', '.env']) {
  const p = path.join(process.cwd(), file);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    if (line.trim().startsWith('#')) continue;
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

const host = process.env.DB_HOST || 'localhost';
const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1';
const pool = new Pool({
  user: process.env.DB_USER,
  host,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT) || 5432,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

const RESET = process.argv.includes('--reset');

// ------------------------------------------------- takrorlanadigan tasodif
// Bir xil urug' -> bir xil ma'lumot (mulberry32).
let seedState = 20260829;
function rnd() {
  seedState |= 0;
  seedState = (seedState + 0x6d2b79f5) | 0;
  let t = Math.imul(seedState ^ (seedState >>> 15), 1 | seedState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const int = (min, max) => min + Math.floor(rnd() * (max - min + 1));

// ------------------------------------------------------------- ma'lumotlar
const ISM_OGIL = ['Abdulloh', 'Muhammad', 'Amirxon', 'Imron', 'Yusuf', 'Ibrohim', 'Umar', 'Ali', 'Doniyor', 'Sardor', 'Javohir', 'Bekzod', 'Islom', 'Samandar', 'Diyor', 'Asadbek', 'Shohruh', 'Temur'];
const ISM_QIZ = ['Oysha', 'Fotima', 'Zaynab', 'Madina', 'Sevinch', 'Nilufar', 'Robiya', 'Maryam', 'Zilola', 'Gulnoza', 'Shahrizoda', 'Muslima', 'Sabina', 'Malika', 'Dilnoza', 'Iroda'];
const FAMILIYA = ['Karimov', 'Rahimov', 'Yusupov', 'Toshmatov', 'Ergashev', 'Sobirov', 'Nazarov', 'Xolmatov', 'Qodirov', 'Ismoilov', 'Jo‘raev', 'Sultonov', 'Umarov', 'Bekmurodov', 'Aliyev', 'Xasanov'];
const AYOL_ISM = ['Gulbahor', 'Nodira', 'Zulfiya', 'Dilorom', 'Munira', 'Ozoda', 'Shahnoza', 'Ra’no', 'Feruza', 'Kamola', 'Nasiba', 'Malohat'];
const ERKAK_ISM = ['Alisher', 'Bahodir', 'Rustam', 'Jasur', 'Otabek', 'Farrux', 'Sanjar', 'Ulug‘bek'];
const KOCHA = ['Amir Temur', 'Navoiy', 'Bobur', 'Mustaqillik', 'Chilonzor', 'Yunusobod', 'Bog‘ishamol', 'Yangiobod', 'Guliston', 'Farobiy'];

const phone = () => `+9989${int(0, 9)}${String(int(0, 9999999)).padStart(7, '0')}`;
const address = () => `Toshkent sh., ${pick(KOCHA)} ko‘chasi, ${int(1, 120)}-uy`;
const pasport = () => `A${['A', 'B', 'C'][int(0, 2)]} ${int(1000000, 9999999)}`;

// Sana yordamchilari (mahalliy vaqt bo'yicha, YYYY-MM-DD)
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const BUGUN = new Date(2026, 7, 29); // 2026-08-29

// Oxirgi 3 oyning ish kunlari (dushanba–juma)
function ishKunlari(oyOrqaga) {
  const kunlar = [];
  const boshlanish = new Date(BUGUN.getFullYear(), BUGUN.getMonth() - oyOrqaga, 1);
  for (let d = new Date(boshlanish); d <= BUGUN; d.setDate(d.getDate() + 1)) {
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) kunlar.push(iso(d));
  }
  return kunlar;
}

// -------------------------------------------------------------- yordamchi
// Ko'p qatorni bitta INSERT bilan yozadi (uzoq bazaga har qator uchun alohida
// borib-kelmaslik uchun). PostgreSQL bitta so'rovda 65535 parametrni ko'taradi.
async function insertMany(table, columns, rows, { returning = 'id' } = {}) {
  if (rows.length === 0) return [];
  const perRow = columns.length;
  const maxRows = Math.floor(60000 / perRow);
  const ids = [];

  for (let i = 0; i < rows.length; i += maxRows) {
    const chunk = rows.slice(i, i + maxRows);
    const params = [];
    const values = chunk.map((row) => {
      const placeholders = row.map((v) => {
        params.push(v);
        return `$${params.length}`;
      });
      return `(${placeholders.join(',')})`;
    });
    const sql =
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${values.join(',')}` +
      (returning ? ` RETURNING ${returning}` : '');
    const res = await pool.query(sql, params);
    if (returning) ids.push(...res.rows.map((r) => r[returning]));
  }
  return ids;
}

// Demo ma'lumot yoziladigan jadvallar (admin va davomat_settings tegilmaydi).
const DEMO_TABLES = [
  'bola_kun', 'bola_kun_prp', 'bola_kuni_all', 'darssana',
  'bola_pay_control', 'bola_pay_new', 'daromat_type',
  'bola', 'bola_prp', 'guruh',
  'taom_ingredient', 'taom_ishlatish', 'taom',
  'chiqim_ombor', 'sklad_product_taktic', 'sklad_product',
  'chiqim_maishiy', 'kirim_maishiy', 'sklad_maishiy',
  'chiqim_qoshimcha',
  'bonus', 'jarima', 'kunlik', 'oylik_type',
  'xodim_one_day', 'xodim_workdays', 'xodim', 'lavozim',
  'group_admin', 'tarix',
];

async function bosh() {
  // --------------------------------------------------- holatni tekshirish
  const { rows: cnt } = await pool.query(
    `SELECT (SELECT COUNT(*) FROM bola)::int AS bola, (SELECT COUNT(*) FROM xodim)::int AS xodim`
  );
  const bor = cnt[0].bola > 0 || cnt[0].xodim > 0;

  if (bor && !RESET) {
    console.log(`Bazada allaqachon ma'lumot bor (${cnt[0].bola} bola, ${cnt[0].xodim} xodim).`);
    console.log('Qaytadan to‘ldirish uchun:  npm run seed:demo -- --reset');
    return;
  }

  if (RESET) {
    console.log('Demo jadvallar tozalanmoqda...');
    // Bitta so'rov: TRUNCATE ... RESTART IDENTITY id hisoblagichlarini ham qaytaradi.
    await pool.query(`TRUNCATE ${DEMO_TABLES.join(', ')} RESTART IDENTITY CASCADE`);
  }

  // ------------------------------------------------------------- lavozim
  const lavozimlar = ['Direktor', 'Metodist', 'Tarbiyachi', 'Yordamchi tarbiyachi', 'Oshpaz', 'Hamshira', 'Farrosh', 'Qorovul'];
  const lavozimIds = await insertMany('lavozim', ['name'], lavozimlar.map((n) => [n]));
  const L = Object.fromEntries(lavozimlar.map((n, i) => [n, lavozimIds[i]]));

  // --------------------------------------------------------------- xodim
  // ish_tur: 1 = davomat yuritiladi, 2 = erkin (davomatsiz)
  const xodimTarkib = [
    ['Direktor', 1, 9000000, 2], ['Metodist', 1, 6500000, 1],
    ['Tarbiyachi', 5, 5500000, 1], ['Yordamchi tarbiyachi', 5, 4200000, 1],
    ['Oshpaz', 2, 5000000, 1], ['Hamshira', 1, 4800000, 1],
    ['Farrosh', 2, 3500000, 1], ['Qorovul', 2, 3800000, 2],
  ];
  const xodimRows = [];
  for (const [lavozim, soni, oylik, ishTur] of xodimTarkib) {
    for (let i = 0; i < soni; i++) {
      const ayol = !['Qorovul', 'Direktor'].includes(lavozim) || rnd() > 0.5;
      const ism = ayol ? pick(AYOL_ISM) : pick(ERKAK_ISM);
      xodimRows.push([
        `${ism} ${pick(FAMILIYA)}`, phone(), L[lavozim], address(),
        oylik + int(-3, 3) * 100000, ishTur, '08:00', '18:00',
      ]);
    }
  }
  const xodimIds = await insertMany(
    'xodim',
    ['name', 'phone', 'lavozim_id', 'address', 'oylik', 'ish_tur', 'start_time', 'end_time'],
    xodimRows
  );
  const tarbiyachiIds = xodimIds.slice(2, 7); // 5 ta tarbiyachi

  // --------------------------------------------------------------- guruh
  const guruhNomlari = ['Kichik guruh "Quyoshcha"', 'Kichik guruh "Kapalak"', 'O‘rta guruh "Gulzor"', 'Katta guruh "Bilimdon"', 'Tayyorlov guruhi "Zukko"'];
  const guruhIds = await insertMany(
    'guruh', ['name', 'xodim_id'],
    guruhNomlari.map((n, i) => [n, tarbiyachiIds[i]])
  );

  // ---------------------------------------------------------------- bola
  const bolaRows = [];
  let metrkaNo = 250000;
  for (let g = 0; g < guruhIds.length; g++) {
    const soni = int(11, 14);
    for (let i = 0; i < soni; i++) {
      const ogil = rnd() > 0.48;
      const familiya = pick(FAMILIYA);
      const ism = ogil ? pick(ISM_OGIL) : pick(ISM_QIZ);
      const yosh = 3 + g; // guruh kattalashgani sari yosh ham
      const tugilgan = new Date(BUGUN.getFullYear() - yosh, int(0, 11), int(1, 28));
      const oylik = [1200000, 1400000, 1500000, 1600000][int(0, 3)];
      bolaRows.push([
        `${ism} ${familiya}`,
        `M-${metrkaNo++}`,
        guruhIds[g],
        iso(tugilgan),
        oylik,
        int(-2, 3) * 100000, // balans: ba'zisi qarzdor, ba'zisi oldindan to'lagan
        rnd() > 0.9 ? 'Yangi' : 'Faol',
        `${pick(ERKAK_ISM)} ${familiya}`, phone(), pasport(),
        `${pick(AYOL_ISM)} ${familiya}`, phone(), pasport(),
        phone(), address(), null, true,
      ]);
    }
  }
  const bolaIds = await insertMany(
    'bola',
    ['username', 'metrka', 'guruh_id', 'tugilgan_kun', 'oylik_toliv', 'balans', 'holati',
      'ota_fish', 'ota_phone', 'ota_pasport', 'ona_fish', 'ona_phone', 'ona_pasport',
      'qoshimcha_phone', 'address', 'description', 'is_active'],
    bolaRows
  );

  // ---------------------------------------------------- dars kunlari (3 oy)
  const MAVZULAR = ['Tabiat va biz', 'Sonlar olami', 'Ranglar', 'Oilam', 'Kasblar', 'Fasllar', 'Hayvonot dunyosi', 'Sog‘lom turmush', 'Vatanim', 'Ertaklar olami', 'Harflar bilan tanishuv', 'Musiqa mashg‘uloti'];
  const kunlar = ishKunlari(2);
  const darsKunIds = await insertMany(
    'bola_kuni_all', ['mavzu', 'sana'],
    kunlar.map((k) => [pick(MAVZULAR), k])
  );
  await insertMany('darssana', ['mavzu', 'sana'], kunlar.map((k) => [pick(MAVZULAR), k]), { returning: null });

  // ------------------------------------------------------------- davomat
  // holati: 1 = keldi, 2 = kelmadi. ~88% davomat.
  const davomatRows = [];
  for (const darsId of darsKunIds) {
    for (const bolaId of bolaIds) {
      davomatRows.push([rnd() < 0.88 ? 1 : 2, bolaId, darsId]);
    }
  }
  await insertMany('bola_kun', ['holati', 'bola_id', 'darssana_id'], davomatRows, { returning: null });

  // -------------------------------------------------------- to'lovlar
  const oylar = [-2, -1, 0].map((off) => {
    const d = new Date(BUGUN.getFullYear(), BUGUN.getMonth() + off, 1);
    return { yil: d.getFullYear(), oy: d.getMonth() };
  });

  const daromadRows = [];
  for (const bolaId of bolaIds) {
    for (const { yil, oy } of oylar) {
      if (rnd() < 0.08) continue; // ba'zilar to'lamagan
      const kun = int(1, 25);
      const jami = [1200000, 1400000, 1500000, 1600000][int(0, 3)];
      const usul = rnd();
      daromadRows.push([
        bolaId, iso(new Date(yil, oy, kun)),
        usul < 0.45 ? jami : 0,              // naqt
        usul >= 0.45 && usul < 0.85 ? jami : 0, // karta
        usul >= 0.85 ? jami : 0,             // prichislena
        0,
      ]);
    }
  }
  await insertMany('daromat_type',
    ['bola_id', 'sana', 'naqt', 'karta', 'prichislena', 'naqt_prichislena'],
    daromadRows, { returning: null });

  // Bonus / chegirma (bola_pay_control) va to'lov miqdori o'zgarishi
  const payControl = [];
  for (let i = 0; i < 18; i++) {
    const { yil, oy } = pick(oylar);
    const bonus = rnd() > 0.5;
    payControl.push([
      pick(bolaIds), bonus ? -int(1, 3) * 50000 : int(1, 3) * 50000,
      iso(new Date(yil, oy, int(1, 26))),
      bonus ? 'Aka-singil chegirmasi' : 'Kechikkan to‘lov uchun',
    ]);
  }
  await insertMany('bola_pay_control', ['bola_id', 'miqdor', 'sana', 'izoh'], payControl, { returning: null });

  const payNew = [];
  for (let i = 0; i < 10; i++) {
    payNew.push([pick(bolaIds), [1300000, 1450000, 1550000][int(0, 2)], iso(new Date(oylar[0].yil, oylar[0].oy, int(1, 20)))]);
  }
  await insertMany('bola_pay_new', ['bola_id', 'miqdor', 'sana'], payNew, { returning: null });

  // -------------------------------------------------------- oshxona ombori
  const mahsulotlar = [
    ['Guruch', 'kg'], ['Un', 'kg'], ['Kartoshka', 'kg'], ['Sabzi', 'kg'], ['Piyoz', 'kg'],
    ['Go‘sht (mol)', 'kg'], ['Tovuq go‘shti', 'kg'], ['Yog‘', 'litr'], ['Sut', 'litr'],
    ['Tuxum', 'dona'], ['Makaron', 'kg'], ['Qand', 'kg'], ['Tuz', 'kg'], ['Choy', 'kg'],
    ['Non', 'dona'], ['Pomidor', 'kg'], ['Bodring', 'kg'], ['Olma', 'kg'], ['Kartoshka krahmali', 'kg'], ['Grechka', 'kg'],
  ];
  const mahsulotIds = await insertMany('sklad_product', ['nomi', 'hajm', 'hajm_birlik'],
    mahsulotlar.map(([n, b]) => [n, int(20, 200), b]));

  const kirimOmbor = [];
  for (const id of mahsulotIds) {
    for (let i = 0; i < int(1, 3); i++) {
      kirimOmbor.push([int(10, 60), id, int(15000, 90000), pick(['naqt', 'karta', 'bank']), 'Yetkazib beruvchidan qabul qilindi']);
    }
  }
  await insertMany('sklad_product_taktic',
    ['hajm', 'sklad_product_id', 'narx', 'payment_method', 'description'], kirimOmbor, { returning: null });

  const chiqimOmbor = [];
  for (const kun of kunlar.slice(-40)) {
    for (let i = 0; i < 3; i++) {
      chiqimOmbor.push([int(2, 12), pick(mahsulotIds), 'Kunlik ovqatlanish uchun', `${kun} 09:00:00+05`]);
    }
  }
  await insertMany('chiqim_ombor',
    ['hajm', 'sklad_product_id', 'description', 'chiqim_sana'], chiqimOmbor, { returning: null });

  // ------------------------------------------------------- maishiy ombor
  const maishiy = [
    ['Yuvish kukuni', 'kg'], ['Sovun', 'dona'], ['Qo‘lqop', 'dona'], ['Latta', 'dona'],
    ['Supurgi', 'dona'], ['Chelak', 'dona'], ['Salfetka', 'dona'], ['Xlorka', 'litr'],
    ['Qog‘oz sochiq', 'dona'], ['Lampochka', 'dona'], ['Axlat paketi', 'dona'], ['Dush geli', 'litr'],
  ];
  const maishiyIds = await insertMany('sklad_maishiy', ['nomi', 'hajm', 'hajm_birlik'],
    maishiy.map(([n, b]) => [n, int(10, 80), b]));

  const kirimMaishiy = [];
  for (const id of maishiyIds) {
    kirimMaishiy.push([int(5, 40), id, int(10000, 120000), pick(['naqt', 'karta']), 'Do‘kondan xarid']);
  }
  await insertMany('kirim_maishiy',
    ['hajm', 'sklad_product_id', 'narx', 'payment_method', 'description'], kirimMaishiy, { returning: null });

  const chiqimMaishiy = [];
  for (let i = 0; i < 30; i++) {
    const { yil, oy } = pick(oylar);
    chiqimMaishiy.push([int(1, 8), pick(maishiyIds), 'Tozalash ishlari uchun', `${iso(new Date(yil, oy, int(1, 27)))} 10:00:00+05`]);
  }
  await insertMany('chiqim_maishiy',
    ['hajm', 'sklad_product_id', 'description', 'chiqim_sana'], chiqimMaishiy, { returning: null });

  // ---------------------------------------------------------------- taom
  const taomlar = ['Sho‘rva', 'Palov', 'Makaron', 'Grechka bo‘tqasi', 'Sutli bo‘tqa', 'Kotlet va pyure', 'Mastava', 'Lag‘mon', 'Tovuqli sho‘rva', 'Manti'];
  const taomIds = await insertMany('taom', ['nomi'], taomlar.map((n) => [n]));

  const ingredientlar = [];
  for (const taomId of taomIds) {
    const ishlatilgan = new Set();
    for (let i = 0; i < int(3, 5); i++) {
      const pid = pick(mahsulotIds);
      if (ishlatilgan.has(pid)) continue;
      ishlatilgan.add(pid);
      ingredientlar.push([taomId, pid, int(1, 15) / 10]);
    }
  }
  await insertMany('taom_ingredient', ['taom_id', 'sklad_product_id', 'miqdor'], ingredientlar, { returning: null });

  const taomIshlatish = [];
  for (const kun of kunlar.slice(-40)) {
    taomIshlatish.push([pick(taomIds), kun, int(45, 65)]);
  }
  await insertMany('taom_ishlatish', ['taom_id', 'sana', 'bolalar_soni'], taomIshlatish, { returning: null });

  // ------------------------------------------------------- xodim moliyasi
  // Oylik har oy uchun to'liq beriladi — hisobotlar hamma oyda to'ldirilgan
  // ko'rinsin (avvalgi variantda joriy oy bo'sh qolib ketgandi).
  const oylikRows = [];
  for (const xid of xodimIds) {
    for (const { yil, oy } of oylar) {
      oylikRows.push([xid, int(35, 60) * 100000, `${iso(new Date(yil, oy, 5))} 12:00:00+05`]);
    }
  }
  await insertMany('oylik_type', ['xodim_id', 'narx', 'created_at'], oylikRows, { returning: null });

  // Bonus/jarima/kunlikni ham har oyga taqsimlaymiz: tasodifga tashlab
  // qo'ysak, biror oy bo'm-bo'sh chiqib qolishi mumkin.
  const bonusRows = [], jarimaRows = [], kunlikRows = [];
  for (const { yil, oy } of oylar) {
    const sana = () => `${iso(new Date(yil, oy, int(1, 27)))} 12:00:00+05`;
    for (let i = 0; i < 4; i++) bonusRows.push([pick(xodimIds), int(2, 8) * 100000, sana()]);
    for (let i = 0; i < 3; i++) jarimaRows.push([pick(xodimIds), int(1, 3) * 50000, sana()]);
    for (let i = 0; i < 5; i++) kunlikRows.push([pick(xodimIds), int(1, 5) * 100000, sana()]);
  }
  await insertMany('bonus', ['xodim_id', 'narx', 'created_at'], bonusRows, { returning: null });
  await insertMany('jarima', ['xodim_id', 'narx', 'created_at'], jarimaRows, { returning: null });
  await insertMany('kunlik', ['xodim_id', 'narx', 'created_at'], kunlikRows, { returning: null });

  // ------------------------------------------------------ xodim davomati
  const workdayRows = [];
  for (const xid of xodimIds) {
    for (const kun of kunlar) workdayRows.push([xid, kun]);
  }
  const workdayIds = await insertMany('xodim_workdays', ['xodim_id', 'work_day'], workdayRows);

  // Oxirgi 30 kun uchun kelish/ketish vaqtlari
  const oneDayRows = [];
  let wIdx = 0;
  for (const xid of xodimIds) {
    for (let k = 0; k < kunlar.length; k++) {
      const wid = workdayIds[wIdx++];
      if (k < kunlar.length - 30) continue;
      if (rnd() < 0.06) continue; // ba'zi kunlar kelmagan
      const kel = `0${int(7, 8)}:${String(int(0, 59)).padStart(2, '0')}:00`;
      const ket = `1${int(7, 8)}:${String(int(0, 59)).padStart(2, '0')}:00`;
      oneDayRows.push([xid, wid, kel, ket]);
    }
  }
  await insertMany('xodim_one_day',
    ['xodim_id', 'xodim_workdays_id', 'start_time', 'end_time'], oneDayRows, { returning: null });

  // ------------------------------------------------- qo'shimcha chiqimlar
  const qoshimcha = [
    'Internet to‘lovi', 'Elektr energiya', 'Suv ta’minoti', 'Gaz to‘lovi',
    'Kanselyariya buyumlari', 'O‘yinchoqlar', 'Ta’mirlash ishlari', 'Bayram tadbiri',
    'Tibbiy ko‘rik', 'Reklama xarajati', 'Transport xizmati', 'Dezinfeksiya',
  ];
  await insertMany('chiqim_qoshimcha', ['price', 'payment_method', 'description'],
    qoshimcha.map((d) => [int(3, 40) * 100000, pick(['naqt', 'karta', 'bank']), d]), { returning: null });

  // ------------------------------------------------------- demo adminlar
  const parol = await bcrypt.hash('12345', 10);
  const demoAdminlar = [
    ['bugalter', '+998901112233', 2, 'Buxgalter (demo)'],
    ['hamshira', '+998901112244', 3, 'Hamshira (demo)'],
    ['tarbiyachi1', '+998901112255', 3, 'Tarbiyachi (demo)'],
  ];
  const mavjud = await pool.query('SELECT username FROM admin WHERE username = ANY($1)',
    [demoAdminlar.map((a) => a[0])]);
  const bormi = new Set(mavjud.rows.map((r) => r.username));
  const yangiAdminlar = demoAdminlar.filter((a) => !bormi.has(a[0]));
  const adminIds = await insertMany('admin',
    ['username', 'phone_number', 'type', 'description', 'password', 'is_active'],
    yangiAdminlar.map(([u, p, t, d]) => [u, p, t, d, parol, true]));

  // Ruxsatlar: buxgalterga moliya, tarbiyachiga davomat
  const MODULES = ['admins', 'students', 'groups', 'attendance', 'childDay', 'payments', 'employees', 'salaries', 'positions', 'menuMeals', 'extras'];
  const VIEW_ONLY = ['dashboard', 'kitchen_incomes', 'kitchen_expenses', 'kitchen_storage', 'household_incomes', 'household_expenses', 'household_storage'];
  function ruxsat(toliq) {
    const p = {};
    for (const m of MODULES) for (const a of ['view', 'create', 'edit', 'delete']) p[`${a}_${m}`] = toliq.includes(m);
    for (const m of VIEW_ONLY) p[`view_${m}`] = true;
    return p;
  }
  if (adminIds.length) {
    const ruxsatlar = [
      [adminIds[0], JSON.stringify(ruxsat(['payments', 'salaries', 'extras']))],
      [adminIds[1], JSON.stringify(ruxsat(['students', 'attendance']))],
      [adminIds[2], JSON.stringify(ruxsat(['attendance', 'childDay']))],
    ].slice(0, adminIds.length);
    await insertMany('permissions', ['admin_id', 'data'], ruxsatlar, { returning: null });

    // Tarbiyachi adminni guruhlarga biriktiramiz
    if (adminIds[2]) {
      await insertMany('group_admin', ['admin_id', 'group_id'],
        [[adminIds[2], guruhIds[0]], [adminIds[2], guruhIds[1]]], { returning: null });
    }
  }

  // ------------------------------------------------------------- xulosa
  const summary = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM xodim)::int AS xodim,
      (SELECT COUNT(*) FROM guruh)::int AS guruh,
      (SELECT COUNT(*) FROM bola)::int AS bola,
      (SELECT COUNT(*) FROM bola_kuni_all)::int AS dars_kuni,
      (SELECT COUNT(*) FROM bola_kun)::int AS davomat,
      (SELECT COUNT(*) FROM daromat_type)::int AS tolov,
      (SELECT COUNT(*) FROM sklad_product)::int AS mahsulot,
      (SELECT COUNT(*) FROM taom)::int AS taom,
      (SELECT COUNT(*) FROM xodim_one_day)::int AS xodim_davomat,
      (SELECT COUNT(*) FROM admin)::int AS admin`);
  const s = summary.rows[0];
  console.log('\n✅ Demo ma’lumot tayyor:');
  console.log(`   Xodimlar: ${s.xodim}   Guruhlar: ${s.guruh}   Bolalar: ${s.bola}`);
  console.log(`   Dars kunlari: ${s.dars_kuni}   Davomat yozuvlari: ${s.davomat}`);
  console.log(`   To‘lovlar: ${s.tolov}   Ombor mahsulotlari: ${s.mahsulot}   Taomlar: ${s.taom}`);
  console.log(`   Xodim davomati: ${s.xodim_davomat}   Adminlar: ${s.admin}`);
  console.log('\n   Kirish: admin / 12345  (bugalter, hamshira, tarbiyachi1 — parol ham 12345)');
}

bosh()
  .catch((err) => {
    console.error('❌ Xato:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
