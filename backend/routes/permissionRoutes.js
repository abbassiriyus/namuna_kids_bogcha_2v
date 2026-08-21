const express = require('express');
const router = express.Router();
const pool = require('../db');
const verifyToken = require('../middleware/verifyToken');

// GET permissions for one admin
router.get('/:adminId', verifyToken, async (req, res) => {
  const { adminId } = req.params;
  try {
    const result = await pool.query(
      'SELECT data FROM permissions WHERE admin_id = $1',
      [adminId]
    );
    res.status(200).json({ permissions: result.rows[0]?.data || {} });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SAVE (create or replace) permissions for one admin
router.post('/:adminId', verifyToken, async (req, res) => {
  const { adminId } = req.params;
  const { permissions } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO permissions (admin_id, data)
       VALUES ($1, $2)
       ON CONFLICT (admin_id)
       DO UPDATE SET data = $2, updated_at = CURRENT_TIMESTAMP
       RETURNING data`,
      [adminId, permissions || {}]
    );
    res.status(200).json({ permissions: result.rows[0].data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
