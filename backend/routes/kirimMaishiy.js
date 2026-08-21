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
      query += ` AND sklad_product_id = $${values.length}`;
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
  const data = req.body; // array of kirim_maishiy
  if (!Array.isArray(data) || data.length === 0) {
    return res.status(400).json({ error: 'Data should be a non-empty array' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const params = [];
    const values = data.map(item => {
      params.push(item.sklad_product_id, item.hajm, item.narx, item.description || null);
      const n = params.length;
      return `($${n - 3}, $${n - 2}, $${n - 1}, $${n})`;
    }).join(',');

    const result = await client.query(
      `INSERT INTO kirim_maishiy (sklad_product_id, hajm, narx, description)
       VALUES ${values}
       RETURNING *`,
      params
    );

    await client.query('COMMIT');
    res.status(201).json(result.rows);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (rollbackErr) { console.error('Rollback xatolik:', rollbackErr.message); }
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
