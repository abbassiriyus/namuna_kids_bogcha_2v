// Ombordagi mavjud qoldiq alohida ustunda saqlanmaydi, u har safar shu formula
// bilan hisoblanadi:
//   qoldiq = mahsulotning boshlang'ich hajmi + barcha kirimlar - barcha chiqimlar
//
// Ikkita mustaqil ombor bor: oshxona (taomlar uchun) va maishiy buyumlar.
const WAREHOUSES = {
  oshxona: {
    product: 'sklad_product',
    kirim: 'sklad_product_taktic',
    chiqim: 'chiqim_ombor',
  },
  maishiy: {
    product: 'sklad_maishiy',
    kirim: 'kirim_maishiy',
    chiqim: 'chiqim_maishiy',
  },
};

// Jadval nomlari faqat yuqoridagi konstantadan olinadi — foydalanuvchi kiritmasidan emas.
function tables(warehouse) {
  const t = WAREHOUSES[warehouse];
  if (!t) throw new Error(`Noma'lum ombor: ${warehouse}`);
  return t;
}

/**
 * Berilgan mahsulotlar bo'yicha qoldiqni qaytaradi: Map(id -> { nomi, hajm_birlik, mavjud }).
 *
 * excludeChiqimId — tahrirlash (PUT) uchun: shu chiqim yozuvining o'zi
 * hisobdan chiqariladi, aks holda mahsulot ikki marta yechilgandek ko'rinadi.
 */
async function getAvailableStock(db, productIds, { warehouse = 'oshxona', excludeChiqimId = null } = {}) {
  const ids = [...new Set(productIds.map(Number).filter(Number.isInteger))];
  if (ids.length === 0) return new Map();

  const t = tables(warehouse);
  const params = [ids];
  let chiqimFilter = '';
  if (excludeChiqimId) {
    params.push(Number(excludeChiqimId));
    chiqimFilter = `WHERE id <> $${params.length}`;
  }

  const { rows } = await db.query(
    `SELECT s.id,
            s.nomi,
            s.hajm_birlik,
            s.hajm + COALESCE(k.kirim, 0) - COALESCE(c.chiqim, 0) AS mavjud
     FROM ${t.product} s
     LEFT JOIN (
       SELECT sklad_product_id, SUM(hajm) AS kirim
       FROM ${t.kirim} GROUP BY sklad_product_id
     ) k ON k.sklad_product_id = s.id
     LEFT JOIN (
       SELECT sklad_product_id, SUM(hajm) AS chiqim
       FROM ${t.chiqim} ${chiqimFilter} GROUP BY sklad_product_id
     ) c ON c.sklad_product_id = s.id
     WHERE s.id = ANY($1::int[])`,
    params
  );

  return new Map(
    rows.map((r) => [r.id, { nomi: r.nomi, hajm_birlik: r.hajm_birlik, mavjud: Number(r.mavjud) }])
  );
}

/**
 * Chiqim qatorlari uchun omborda yetarli mahsulot bor-yo'qligini tekshiradi.
 * items: [{ sklad_product_id, hajm }]
 * Qaytaradi: yetishmayotgan mahsulotlar ro'yxati (bo'sh bo'lsa — hammasi joyida).
 */
async function checkStock(db, items, { warehouse = 'oshxona', excludeChiqimId = null } = {}) {
  // Bitta so'rovda bir mahsulot bir necha qatorda kelishi mumkin — yig'ib tekshiramiz.
  const kerakMap = new Map();
  for (const it of items) {
    const id = Number(it.sklad_product_id);
    kerakMap.set(id, (kerakMap.get(id) || 0) + Number(it.hajm));
  }

  const stock = await getAvailableStock(db, [...kerakMap.keys()], { warehouse, excludeChiqimId });

  const yetishmaydi = [];
  for (const [id, kerak] of kerakMap) {
    const info = stock.get(id);
    if (!info) {
      yetishmaydi.push({ sklad_product_id: id, nomi: `#${id}`, kerak, mavjud: 0, hajm_birlik: '' });
      continue;
    }
    if (kerak > info.mavjud) {
      yetishmaydi.push({
        sklad_product_id: id,
        nomi: info.nomi,
        kerak,
        mavjud: info.mavjud,
        hajm_birlik: info.hajm_birlik,
      });
    }
  }
  return yetishmaydi;
}

/** Yetishmovchilikni foydalanuvchiga ko'rsatiladigan matnga aylantiradi. */
function stockErrorMessage(yetishmaydi) {
  const detail = yetishmaydi
    .map((y) => `${y.nomi}: kerak ${y.kerak} ${y.hajm_birlik}, omborda ${y.mavjud} ${y.hajm_birlik}`)
    .join('; ');
  return `Omborda yetarli mahsulot yo‘q — ${detail}`;
}

/**
 * Chiqim yozishdan oldin mahsulot qatorlarini bloklaydi, shunda ikkita
 * bir vaqtda kelgan so'rov qoldiqni manfiyga tushirib yubormaydi.
 */
async function lockProducts(db, productIds, warehouse = 'oshxona') {
  const ids = [...new Set(productIds.map(Number).filter(Number.isInteger))];
  if (ids.length === 0) return;
  const t = tables(warehouse);
  await db.query(`SELECT id FROM ${t.product} WHERE id = ANY($1::int[]) FOR UPDATE`, [ids]);
}

/** Bitta chiqim qatorining maydonlarini tekshiradi. */
function validateChiqim({ hajm, sklad_product_id, chiqim_sana }) {
  const errors = [];
  const productId = Number(sklad_product_id);
  const hajmNum = Number(hajm);

  if (!sklad_product_id || !Number.isInteger(productId) || productId <= 0) {
    errors.push('Mahsulot tanlanmagan yoki noto‘g‘ri');
  }
  if (hajm === undefined || hajm === null || hajm === '' || !Number.isFinite(hajmNum) || hajmNum <= 0) {
    errors.push('Hajm noto‘g‘ri yoki kiritilmagan');
  } else if (hajmNum > 9999999999.99) {
    errors.push('Hajm qiymati juda katta');
  }
  if (!chiqim_sana) {
    errors.push('Chiqim sanasi kiritilmagan');
  }
  return errors;
}

module.exports = {
  WAREHOUSES,
  getAvailableStock,
  checkStock,
  stockErrorMessage,
  lockProducts,
  validateChiqim,
};
