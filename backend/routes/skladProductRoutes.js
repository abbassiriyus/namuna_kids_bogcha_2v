const express = require('express');
const router = express.Router();
const pool = require('../db');
const verifyToken = require('../middleware/verifyToken');

// ✅ GET — barcha sklad_product
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM sklad_product ORDER BY id DESC`
    );
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ POST — yangi mahsulot qo‘shish
router.post('/', verifyToken, async (req, res) => {
  const { hajm, hajm_birlik,nomi } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO sklad_product (hajm, hajm_birlik,nomi) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [hajm, hajm_birlik,nomi]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ PUT — mahsulotni yangilash
router.put('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { hajm, hajm_birlik,nomi } = req.body;

  try {
    const result = await pool.query(
      `UPDATE sklad_product 
       SET hajm = $1, hajm_birlik = $2,nomi=$3, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $4 
       RETURNING *`,
      [hajm, hajm_birlik,nomi, id]
    );
    res.status(200).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE — mahsulotni o‘chirish
router.delete('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`DELETE FROM sklad_product WHERE id = $1`, [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
