const express = require('express');
const router = express.Router();
const pool = require('../db');
const verifyToken = require('../middleware/verifyToken');

// ✅ GET — barcha yoki oyning oylik yozuvlari
router.get('/', verifyToken, async (req, res) => {
  const { month } = req.query; // masalan: 2025-06

  try {
    let result;

    if (month) {
      result = await pool.query(`
        SELECT *
        FROM oylik_type
        WHERE TO_CHAR(created_at, 'YYYY-MM') = $1
        ORDER BY id DESC
      `, [month]);
    } else {
      result = await pool.query(`
        SELECT *
        FROM oylik_type
        ORDER BY id DESC
      `);
    }

    res.status(200).json(result.rows);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ POST — yangi oylik yozuvi qo‘shish
router.post('/', verifyToken, async (req, res) => {
  const { narx, xodim_id } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO oylik_type (narx, xodim_id)
       VALUES ($1, $2)
       RETURNING *`,
      [narx, xodim_id]
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ PUT — mavjud oylik yozuvini yangilash
router.put('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { narx, xodim_id } = req.body;

  try {
    const result = await pool.query(
      `UPDATE oylik_type
       SET narx = $1,
           xodim_id = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [narx, xodim_id, id]
    );

    res.status(200).json(result.rows[0]);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE — oylik yozuvini o‘chirish
router.delete('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM oylik_type WHERE id = $1', [id]);
    res.status(204).send();

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
