const express = require('express');
const router = express.Router();
const pool = require('../db');
const verifyToken = require('../middleware/verifyToken');

// ✅ GET — barcha kunlik ish haqlar (xodim nomi bilan)
router.get('/', verifyToken, async (req, res) => {
  const { month } = req.query; // YYYY-MM format kutiladi

  try {
    let result;

    if (month) {
      // Faqat tanlangan oydagi kunliklar
      result = await pool.query(`
        SELECT k.*, x.name AS xodim_nomi
        FROM kunlik k
        LEFT JOIN xodim x ON k.xodim_id = x.id
        WHERE TO_CHAR(k.created_at, 'YYYY-MM') = $1
        ORDER BY k.id DESC
      `, [month]);
    } else {
      // Hamma oyning kunliklari
      result = await pool.query(`
        SELECT k.*, x.name AS xodim_nomi
        FROM kunlik k
        LEFT JOIN xodim x ON k.xodim_id = x.id
        ORDER BY k.id DESC
      `);
    }

    res.status(200).json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// ✅ POST — yangi kunlik ish haqi qo‘shish
router.post('/', verifyToken, async (req, res) => {
  const { xodim_id, narx } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO kunlik (xodim_id, narx) VALUES ($1, $2) RETURNING *`,
      [xodim_id, narx]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ PUT — kunlik ish haqini yangilash
router.put('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { xodim_id, narx } = req.body;

  try {
    const result = await pool.query(
      `UPDATE kunlik 
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

// ✅ DELETE — kunlik ish haqini o‘chirish
router.delete('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM kunlik WHERE id = $1', [id]);
    res.status(204).send(); // No Content
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
