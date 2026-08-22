const express = require('express');
const router = express.Router();
const pool = require('../db'); // PostgreSQL bog'lanish
const verifyToken = require('../middleware/verifyToken');
const { sendDbError } = require('../utils/dbError');

// Narx majburiy (NOT NULL) — bazaga bo'sh qiymat ketib 500 bermasligi uchun
// oldindan tekshiramiz.
function validateQoshimcha({ price }) {
  const narx = Number(price);
  if (price === undefined || price === null || price === '' || !Number.isFinite(narx) || narx <= 0) {
    return 'Narx kiritilmagan yoki 0 dan katta emas';
  }
  return null;
}

// CREATE – yangi chiqim_qoshimcha qo‘shish
router.post('/',verifyToken, async (req, res) => {
  const { price, payment_method, description } = req.body;
  const error = validateQoshimcha({ price });
  if (error) return res.status(400).json({ error });

  try {
    const result = await pool.query(
      `INSERT INTO chiqim_qoshimcha (price, payment_method, description)
       VALUES ($1, $2, $3) RETURNING *`,
      [price, payment_method || null, description || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    return sendDbError(res, err, 'Qo‘shishda xatolik yuz berdi');
  }
});

// READ – barcha chiqim_qoshimcha yozuvlarini olish
router.get('/',verifyToken, async (req, res) => {
  try {
    const { start, end } = req.query;
    let query = 'SELECT * FROM chiqim_qoshimcha WHERE 1=1';
    const values = [];

    if (start) {
      values.push(start);
      query += ` AND created_at >= $${values.length}`;
    }
    if (end) {
      values.push(end);
      query += ` AND created_at < $${values.length}::timestamptz + INTERVAL '1 day'`;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error('Olishda xatolik:', err.message);
    res.status(500).json({ error: 'Olishda xatolik' });
  }
});

// UPDATE – ma'lumotni yangilash
router.put('/:id',verifyToken, async (req, res) => {
  const { id } = req.params;
  const { price, payment_method, description } = req.body;
  const error = validateQoshimcha({ price });
  if (error) return res.status(400).json({ error });

  try {
    const result = await pool.query(
      `UPDATE chiqim_qoshimcha
       SET price = $1, payment_method = $2, description = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING *`,
      [price, payment_method || null, description || '', id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Yozuv topilmadi' });
    res.json(result.rows[0]);
  } catch (err) {
    return sendDbError(res, err, 'Yangilashda xatolik yuz berdi');
  }
});

// DELETE – yozuvni o‘chirish
router.delete('/:id',verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`DELETE FROM chiqim_qoshimcha WHERE id = $1`, [id]);
    res.status(204).send();
  } catch (err) {
    console.error('O‘chirishda xatolik:', err.message);
    res.status(500).json({ error: 'O‘chirishda xatolik' });
  }
});

module.exports = router;
