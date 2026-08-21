const express = require('express');
const router = express.Router();
const pool = require('../db');
const verifyToken = require('../middleware/verifyToken');

// ✅ GET — barcha jarimalar (xodim ismi bilan birga)
router.get('/', verifyToken, async (req, res) => {
  const { month } = req.query; // YYYY-MM formatda kelsin

  try {
    let result;

    if (month) {
      // Faqat berilgan oydagi jarimalar
      result = await pool.query(`
        SELECT j.*, x.name AS xodim_nomi
        FROM jarima j
        LEFT JOIN xodim x ON j.xodim_id = x.id
        WHERE TO_CHAR(j.created_at, 'YYYY-MM') = $1
        ORDER BY j.id DESC
      `, [month]);
    } else {
      // Agar month berilmasa, hamma jarimalar
      result = await pool.query(`
        SELECT j.*, x.name AS xodim_nomi
        FROM jarima j
        LEFT JOIN xodim x ON j.xodim_id = x.id
        ORDER BY j.id DESC
      `);
    }

    res.status(200).json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// ✅ POST — yangi jarima qo‘shish
router.post('/', verifyToken, async (req, res) => {
  const { xodim_id, narx } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO jarima (xodim_id, narx) VALUES ($1, $2) RETURNING *`,
      [xodim_id, narx]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ PUT — jarimani yangilash
router.put('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { xodim_id, narx } = req.body;

  try {
    const result = await pool.query(
      `UPDATE jarima 
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

// ✅ DELETE — jarimani o‘chirish
router.delete('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM jarima WHERE id = $1', [id]);
    res.status(204).send(); // No Content
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
