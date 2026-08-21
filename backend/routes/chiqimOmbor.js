const express = require('express');
const router = express.Router();
const pool = require('../db'); // PostgreSQL ulanish
const verifyToken = require('../middleware/verifyToken');

// CREATE – yangi chiqim_ombor yozuv qo‘shish
router.post('/', verifyToken, async (req, res) => {
  const { hajm, sklad_product_id, description } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO chiqim_ombor (hajm, sklad_product_id, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [hajm, sklad_product_id, description]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Qo‘shishda xatolik:", err.message);
    res.status(500).json({ error: 'Qo‘shishda xatolik' });
  }
});

// READ – barcha chiqim_ombor yozuvlarini olish
router.get('/chiqim_ombor', async (req, res) => {
  const { start, end, product } = req.query;
  let query = 'SELECT * FROM chiqim_ombor';
  const conditions = [];

  if (start && end) conditions.push(`chiqim_sana BETWEEN '${start}' AND '${end}'`);
  else if (start) conditions.push(`chiqim_sana >= '${start}'`);
  else if (end) conditions.push(`chiqim_sana <= '${end}'`);

  if (product) conditions.push(`sklad_product_id = ${product}`);

  if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY chiqim_sana DESC';

  try {
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Xatolik:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/bulk', async (req, res) => {
  const items = req.body;

  try {
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Bo‘sh ma'lumot yuborildi." });
    }

    const values = items.map(i =>
      `(${i.sklad_product_id}, ${i.hajm}, '${i.description || ''}', '${i.chiqim_sana}')`
    ).join(",");

    const query = `
      INSERT INTO chiqim_ombor (sklad_product_id, hajm, description, chiqim_sana)
      VALUES ${values}
    `;

    await pool.query(query);
    res.status(201).send("OK");
  } catch (err) {
    console.error("Bulk insert error:", err);
    res.status(500).json({ error: err.message });
  }
});


// UPDATE – chiqim_ombor yozuvini yangilash
router.put('/:id',verifyToken, async (req, res) => {
  const { id } = req.params;
  const { hajm, sklad_product_id, description } = req.body;
  try {
    const result = await pool.query(
      `UPDATE chiqim_ombor
       SET hajm = $1,
           sklad_product_id = $2,
           description = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [hajm, sklad_product_id, description, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Yangilashda xatolik:", err.message);
    res.status(500).json({ error: 'Yangilashda xatolik' });
  }
});

// DELETE – chiqim_ombor yozuvini o‘chirish
router.delete('/:id',verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`DELETE FROM chiqim_ombor WHERE id = $1`, [id]);
    res.status(204).send();
  } catch (err) {
    console.error("O‘chirishda xatolik:", err.message);
    res.status(500).json({ error: 'O‘chirishda xatolik' });
  }
});

module.exports = router;
