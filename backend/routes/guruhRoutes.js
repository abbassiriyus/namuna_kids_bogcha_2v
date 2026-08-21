const express = require('express');
const router = express.Router();
const pool = require('../db');
const verifyToken = require('../middleware/verifyToken');

// 📥 GET: barcha guruhlar
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM guruh ORDER BY id DESC');
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ➕ POST: yangi guruh qo‘shish
router.post('/', verifyToken, async (req, res) => {
  const { name, xodim_id } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO guruh (name, xodim_id)
       VALUES ($1, $2)
       RETURNING *`,
      [name, xodim_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✏️ PUT: guruhni yangilash
router.put('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { name, xodim_id } = req.body;

  try {
    const result = await pool.query(
      `UPDATE guruh
       SET name = $1,
           xodim_id = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [name, xodim_id, id]
    );
    res.status(200).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ❌ DELETE: guruhni o‘chirish
router.delete('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM guruh WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
