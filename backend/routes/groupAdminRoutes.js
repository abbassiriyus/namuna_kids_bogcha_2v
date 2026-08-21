const express = require('express');
const router = express.Router();
const pool = require('../db');
const verifyToken = require('../middleware/verifyToken');

// GET /group-admin?admin_id=X — bitta admin uchun (yoki hammasi)
router.get('/', verifyToken, async (req, res) => {
  const { admin_id } = req.query;
  try {
    let query = 'SELECT * FROM group_admin';
    const params = [];
    if (admin_id) {
      query += ' WHERE admin_id = $1';
      params.push(admin_id);
    }
    const result = await pool.query(query, params);
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /group-admin — adminga guruh biriktirish
router.post('/', verifyToken, async (req, res) => {
  const { admin_id, group_id } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO group_admin (admin_id, group_id) VALUES ($1, $2)
       ON CONFLICT (admin_id, group_id) DO NOTHING
       RETURNING *`,
      [admin_id, group_id]
    );
    res.status(201).json(result.rows[0] || { admin_id, group_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /group-admin/:id — biriktirishni olib tashlash
router.delete('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM group_admin WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
