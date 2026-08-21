const express = require('express');
const router = express.Router();
const pool = require('../db');
const verifyToken = require('../middleware/verifyToken');

// 📥 GET: Kirim maishiy bo'yicha filterlash
router.get('/', verifyToken, async (req, res) => {
  try {
    const { start, end, product } = req.query;
    let query = 'SELECT * FROM kirim_maishiy WHERE 1=1';
    const values = [];

    if (start) {
      values.push(start);
      query += ` AND created_at >= $${values.length}`;
    }
    if (end) {
      values.push(end);
      query += ` AND created_at <= $${values.length}`;
    }
    if (product) {
      values.push(product);
      query += ` AND sklad_maishiy_id = $${values.length}`;
    }

    query += ' ORDER BY id DESC';

    const result = await pool.query(query, values);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("Filterda xatolik:", err.message);
    res.status(500).json({ error: err.message });
  }
});


router.post('/multi', verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const data = req.body; // array of kirim_maishiy
    if (!Array.isArray(data)) {
      return res.status(400).json({ error: 'Data should be an array' });
    }

    await client.query('BEGIN');
    const results = [];

    for (const item of data) {
      const { sklad_maishiy_id, hajm, narx, description } = item;
      const result = await client.query(
        `INSERT INTO kirim_maishiy (sklad_maishiy_id, hajm, narx, description)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [sklad_maishiy_id, hajm, narx, description]
      );
      results.push(result.rows[0]);
    }

    await client.query('COMMIT');
    res.status(201).json(results);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Kirim yozishda xatolik:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});


// PUT - mavjud yozuvni tahrirlash
router.put('/:id',verifyToken, async (req, res) => {
  const { id } = req.params;
  const { hajm, sklad_product_id, narx, description } = req.body;
  try {
    const result = await pool.query(
      `UPDATE kirim_maishiy SET
         hajm = $1,
         sklad_product_id = $2,
         narx = $3,
         description = $4,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 RETURNING *`,
      [hajm, sklad_product_id, narx, description, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Tahrirlashda xatolik' });
  }
});

// DELETE - yozuvni o‘chirish
router.delete('/:id',verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM kirim_maishiy WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'O‘chirishda xatolik' });
  }
});

module.exports = router;
