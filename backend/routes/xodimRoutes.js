const express = require('express');
const router = express.Router();
const pool = require('../db');
const verifyToken = require('../middleware/verifyToken');

// ✅ GET — barcha xodimlar
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT x.*, l.name AS lavozim_nomi
      FROM xodim x
      LEFT JOIN lavozim l ON x.lavozim_id = l.id
      ORDER BY x.id DESC
    `);
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ POST — yangi xodim qo‘shish
router.post('/', verifyToken, async (req, res) => {
  const { name, phone, lavozim_id, address, oylik } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO xodim (name, phone, lavozim_id, address, oylik)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, phone, lavozim_id, address, oylik]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ PUT — xodim ma’lumotlarini yangilash
router.put('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { name, phone, lavozim_id, address, oylik } = req.body;

  try {
    const result = await pool.query(
      `UPDATE xodim 
       SET name = $1, phone = $2, lavozim_id = $3, address = $4, oylik = $5, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $6 
       RETURNING *`,
      [name, phone, lavozim_id, address, oylik, id]
    );
    res.status(200).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE — xodimni o‘chirish
router.delete('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM xodim WHERE id = $1', [id]);
    res.status(204).send(); // No Content
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
