const express = require('express');
const router = express.Router();
const pool = require('../db');
const verifyToken = require('../middleware/verifyToken');


// GET /chiqim_maishiy?start=2025-06-01&end=2025-06-30&product=3
router.get('/', verifyToken, async (req, res) => {
  try {
    const { start, end, product } = req.query;
    let baseQuery = 'SELECT * FROM chiqim_maishiy WHERE 1=1';
    const values = [];

    if (start) {
      values.push(start);
      baseQuery += ` AND chiqim_sana >= $${values.length}`;
    }
    if (end) {
      values.push(end);
      baseQuery += ` AND chiqim_sana <= $${values.length}`;
    }
    if (product) {
      values.push(product);
      baseQuery += ` AND sklad_maishiy_id = $${values.length}`;
    }

    baseQuery += ' ORDER BY id DESC';

    const result = await pool.query(baseQuery, values);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Filter getda xatolik:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /chiqim_maishiy/multi
router.post('/multi', verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const data = req.body; // array of chiqim objects
    if (!Array.isArray(data)) {
      return res.status(400).json({ error: 'Data should be an array' });
    }

    await client.query('BEGIN');
    const results = [];

    for (const item of data) {
      const { sklad_maishiy_id, hajm, chiqim_sana, description } = item;
      const result = await client.query(
        `
        INSERT INTO chiqim_maishiy (sklad_maishiy_id, hajm, chiqim_sana, description)
        VALUES ($1, $2, $3, $4)
        RETURNING *
        `,
        [sklad_maishiy_id, hajm, chiqim_sana, description]
      );
      results.push(result.rows[0]);
    }

    await client.query('COMMIT');
    res.status(201).json(results);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Xatolik:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// POST yangi chiqim_maishiy
router.post('/',verifyToken, async (req, res) => {
  const { hajm, sklad_product_id, description } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO chiqim_maishiy (hajm, sklad_product_id, description)
       VALUES ($1, $2, $3) RETURNING *`,
      [hajm, sklad_product_id, description]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Yaratishda xatolik' });
  }
});

// PUT tahrirlash
router.put('/:id',verifyToken, async (req, res) => {
  const { id } = req.params;
  const { hajm, sklad_product_id, description } = req.body;
  try {
    const result = await pool.query(
      `UPDATE chiqim_maishiy SET
         hajm = $1,
         sklad_product_id = $2,
         description = $3,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING *`,
      [hajm, sklad_product_id, description, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Tahrirlashda xatolik' });
  }
});

// DELETE
router.delete('/:id',verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM chiqim_maishiy WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'O‘chirishda xatolik' });
  }
});

module.exports = router;
