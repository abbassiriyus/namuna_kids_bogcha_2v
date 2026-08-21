const express = require('express');
const router = express.Router();
const pool = require('../db');
const verifyToken = require('../middleware/verifyToken');

// ✅ GET — barcha bonuslar (xodim nomi bilan)
router.get('/', verifyToken, async (req, res) => {
  const { month } = req.query; // foydalanuvchi tanlagan oy, masalan: 2025-06

  try {
    let result;

    if (month) {
      // Faqat shu oydagi bonuslar
      result = await pool.query(`
        SELECT b.*, x.name AS xodim_nomi
        FROM bonus b
        LEFT JOIN xodim x ON b.xodim_id = x.id
        WHERE TO_CHAR(b.created_at, 'YYYY-MM') = $1
        ORDER BY b.id DESC
      `, [month]);
    } else {
      // Hamma bonuslar
      result = await pool.query(`
        SELECT b.*, x.name AS xodim_nomi
        FROM bonus b
        LEFT JOIN xodim x ON b.xodim_id = x.id
        ORDER BY b.id DESC
      `);
    }

    res.status(200).json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// ✅ POST — yangi bonus qo‘shish
router.post('/', verifyToken, async (req, res) => {
  const { xodim_id, narx } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO bonus (xodim_id, narx) VALUES ($1, $2) RETURNING *`,
      [xodim_id, narx]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ PUT — bonusni tahrirlash
router.put('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { xodim_id, narx } = req.body;

  try {
    const result = await pool.query(
      `UPDATE bonus 
       SET xodim_id = $1, narx = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3 
       RETURNING *`,
      [xodim_id, narx, id]
    );
    res.status(200).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE — bonusni o‘chirish
router.delete('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM bonus WHERE id = $1', [id]);
    res.status(204).send(); // No Content
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
