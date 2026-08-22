const express = require('express');
const router = express.Router();
const pool = require('../db'); // PostgreSQL ulanish
const verifyToken = require('../middleware/verifyToken');
const { sendDbError } = require('../utils/dbError');

// Bazaga yozishdan oldin qiymatlarni tekshiradi — noto'g'ri kiritilgan
// ma'lumot Postgres xatosi (500) sifatida emas, aniq xabar bilan (400) qaytadi.
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

// CREATE – yangi chiqim_ombor yozuv qo‘shish
router.post('/', verifyToken, async (req, res) => {
  const { hajm, sklad_product_id, description, chiqim_sana } = req.body;
  const errors = validateChiqim({ hajm, sklad_product_id, chiqim_sana });
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join('; ') });
  }
  try {
    const result = await pool.query(
      `INSERT INTO chiqim_ombor (hajm, sklad_product_id, description, chiqim_sana)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [hajm, sklad_product_id, description || '', chiqim_sana]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    return sendDbError(res, err, 'Qo‘shishda xatolik yuz berdi');
  }
});

// READ – barcha chiqim_ombor yozuvlarini olish
router.get('/', verifyToken, async (req, res) => {
  const { start, end, product } = req.query;
  let query = 'SELECT * FROM chiqim_ombor';
  const conditions = [];
  const params = [];

  if (start) { conditions.push(`chiqim_sana >= $${params.length + 1}`); params.push(start); }
  if (end) { conditions.push(`chiqim_sana < $${params.length + 1}::timestamptz + INTERVAL '1 day'`); params.push(end); }
  if (product) { conditions.push(`sklad_product_id = $${params.length + 1}`); params.push(product); }

  if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY chiqim_sana DESC';

  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Xatolik:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/bulk', verifyToken, async (req, res) => {
  const items = req.body;

  try {
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Bo‘sh ma'lumot yuborildi." });
    }

    for (let i = 0; i < items.length; i++) {
      const rowErrors = validateChiqim(items[i]);
      if (rowErrors.length > 0) {
        return res.status(400).json({ error: `${i + 1}-qator: ${rowErrors.join('; ')}` });
      }
    }

    const params = [];
    const values = items.map(i => {
      params.push(i.sklad_product_id, i.hajm, i.description || '', i.chiqim_sana);
      const n = params.length;
      return `($${n - 3}, $${n - 2}, $${n - 1}, $${n})`;
    }).join(",");

    const query = `
      INSERT INTO chiqim_ombor (sklad_product_id, hajm, description, chiqim_sana)
      VALUES ${values}
    `;

    await pool.query(query, params);
    res.status(201).send("OK");
  } catch (err) {
    return sendDbError(res, err, "Ma'lumotlarni saqlashda xatolik yuz berdi");
  }
});


// UPDATE – chiqim_ombor yozuvini yangilash
router.put('/:id',verifyToken, async (req, res) => {
  const { id } = req.params;
  const { hajm, sklad_product_id, description, chiqim_sana } = req.body;
  const errors = validateChiqim({ hajm, sklad_product_id, chiqim_sana });
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join('; ') });
  }
  try {
    const result = await pool.query(
      `UPDATE chiqim_ombor
       SET hajm = $1,
           sklad_product_id = $2,
           description = $3,
           chiqim_sana = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [hajm, sklad_product_id, description || '', chiqim_sana, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Yozuv topilmadi' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    return sendDbError(res, err, 'Yangilashda xatolik yuz berdi');
  }
});

// DELETE – chiqim_ombor yozuvini o‘chirish
router.delete('/:id',verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`DELETE FROM chiqim_ombor WHERE id = $1`, [id]);
    res.status(204).send();
  } catch (err) {
    return sendDbError(res, err, 'O‘chirishda xatolik yuz berdi');
  }
});

module.exports = router;
