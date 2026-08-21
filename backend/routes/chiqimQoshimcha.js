const express = require('express');
const router = express.Router();
const pool = require('../db'); // PostgreSQL bog'lanish
const verifyToken = require('../middleware/verifyToken');

// CREATE – yangi chiqim_qoshimcha qo‘shish
router.post('/',verifyToken, async (req, res) => {
  const { price, description } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO chiqim_qoshimcha (price, description)
       VALUES ($1, $2) RETURNING *`,
      [price, description]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Qo‘shishda xatolik:', err.message);
    res.status(500).json({ error: 'Qo‘shishda xatolik' });
  }
});

// READ – barcha chiqim_qoshimcha yozuvlarini olish
router.get('/',verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM chiqim_qoshimcha ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Olishda xatolik:', err.message);
    res.status(500).json({ error: 'Olishda xatolik' });
  }
});

// UPDATE – ma'lumotni yangilash
router.put('/:id',verifyToken, async (req, res) => {
  const { id } = req.params;
  const { price, description } = req.body;
  try {
    const result = await pool.query(
      `UPDATE chiqim_qoshimcha
       SET price = $1, description = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 RETURNING *`,
      [price, description, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Yangilashda xatolik:', err.message);
    res.status(500).json({ error: 'Yangilashda xatolik' });
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
