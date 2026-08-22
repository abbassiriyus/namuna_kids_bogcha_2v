const express = require('express');
const router = express.Router();
const pool = require('../db');
const verifyToken = require('../middleware/verifyToken');
const { sendDbError } = require('../utils/dbError');

// 📥 GET: barcha taktika yozuvlari (filtrlash bilan)
router.get('/', verifyToken, async (req, res) => {
  try {
    const { start, end, product } = req.query;

    let query = `SELECT * FROM sklad_product_taktic WHERE 1=1`;
    const params = [];

    if (start) {
      params.push(start);
      query += ` AND created_at >= $${params.length}`;
    }

    if (end) {
      params.push(end);
      query += ` AND created_at < $${params.length}::timestamptz + INTERVAL '1 day'`;
    }

    if (product) {
      params.push(product);
      query += ` AND sklad_product_id = $${params.length}`;
    }

    query += ` ORDER BY id DESC`;

    const result = await pool.query(query, params);
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Bazaga yozishdan oldin qiymatlarni tekshiradi — noto'g'ri kiritilgan ma'lumot
// Postgres NOT NULL xatosi (500) sifatida emas, aniq xabar bilan (400) qaytadi.
function validateKirim({ hajm, sklad_product_id, narx }) {
  const errors = [];
  const productId = Number(sklad_product_id);
  const hajmNum = Number(hajm);
  const narxNum = Number(narx);

  if (!sklad_product_id || !Number.isInteger(productId) || productId <= 0) {
    errors.push('Mahsulot tanlanmagan yoki noto‘g‘ri');
  }
  if (hajm === undefined || hajm === null || hajm === '' || !Number.isFinite(hajmNum) || hajmNum <= 0) {
    errors.push('Hajm noto‘g‘ri yoki kiritilmagan');
  }
  if (narx === undefined || narx === null || narx === '' || !Number.isFinite(narxNum) || narxNum < 0) {
    errors.push('Narx noto‘g‘ri yoki kiritilmagan');
  }
  return errors;
}

// ➕ POST: yangi taktika yozuvi (yoki bir nechta yozuv) qo‘shish.
// Frontend bir nechta qator qo'shilganda massiv yuboradi — ikkala shakl ham
// qo'llab-quvvatlanadi, aks holda massiv `undefined` ustunlarga aylanib ketardi.
router.post('/', verifyToken, async (req, res) => {
  const items = Array.isArray(req.body) ? req.body : [req.body];

  if (items.length === 0) {
    return res.status(400).json({ error: "Bo‘sh ma'lumot yuborildi" });
  }

  for (let i = 0; i < items.length; i++) {
    const errors = validateKirim(items[i]);
    if (errors.length > 0) {
      const prefix = items.length > 1 ? `${i + 1}-qator: ` : '';
      return res.status(400).json({ error: prefix + errors.join('; ') });
    }
  }

  try {
    const params = [];
    const values = items.map((it) => {
      params.push(it.hajm, it.sklad_product_id, it.narx, it.payment_method || null, it.description || '');
      const n = params.length;
      return `($${n - 4}, $${n - 3}, $${n - 2}, $${n - 1}, $${n})`;
    }).join(', ');

    const result = await pool.query(
      `INSERT INTO sklad_product_taktic (hajm, sklad_product_id, narx, payment_method, description)
       VALUES ${values}
       RETURNING *`,
      params
    );
    res.status(201).json(Array.isArray(req.body) ? result.rows : result.rows[0]);
  } catch (err) {
    return sendDbError(res, err, 'Kirim qo‘shishda xatolik yuz berdi');
  }
});

// ✏️ PUT: mavjud taktika yozuvini yangilash
router.put('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  // Tahrirlashda ham massiv kelib qolsa, birinchi qatorni olamiz.
  const body = Array.isArray(req.body) ? req.body[0] : req.body;
  const { hajm, sklad_product_id, narx, payment_method, description } = body || {};

  const errors = validateKirim({ hajm, sklad_product_id, narx });
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join('; ') });
  }

  try {
    const result = await pool.query(
      `UPDATE sklad_product_taktic
       SET hajm = $1,
           sklad_product_id = $2,
           narx=$3,
           payment_method=$4,
           description=$5,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [hajm, sklad_product_id, narx, payment_method || null, description || '', id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Yozuv topilmadi' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    return sendDbError(res, err, 'Kirimni yangilashda xatolik yuz berdi');
  }
});

// ❌ DELETE: taktika yozuvini o‘chirish
router.delete('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query(`DELETE FROM sklad_product_taktic WHERE id = $1`, [id]);
    res.status(204).send();
  } catch (err) {
    return sendDbError(res, err, 'Kirimni o‘chirishda xatolik yuz berdi');
  }
});

module.exports = router;
