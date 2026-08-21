const express = require('express');
const router = express.Router();
const pool = require('../db');
const verifyToken = require('../middleware/verifyToken');

// GET /bola_pay_control?bola_id=X
router.get('/', verifyToken, async (req, res) => {
  const { bola_id } = req.query;
  try {
    let query = 'SELECT * FROM bola_pay_control';
    const params = [];
    if (bola_id) {
      query += ' WHERE bola_id = $1';
      params.push(bola_id);
    }
    query += ' ORDER BY sana DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch bola_pay_control error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /bola_pay_control
router.post('/', verifyToken, async (req, res) => {
  const { bola_id, miqdor, sana, izoh } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO bola_pay_control (bola_id, miqdor, sana, izoh) VALUES ($1, $2, $3, $4) RETURNING *`,
      [bola_id, miqdor, sana, izoh]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create bola_pay_control error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /bola_pay_control/:id
router.put('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { bola_id, miqdor, sana, izoh } = req.body;
  try {
    const result = await pool.query(
      `UPDATE bola_pay_control SET bola_id = $1, miqdor = $2, sana = $3, izoh = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *`,
      [bola_id, miqdor, sana, izoh, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update bola_pay_control error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /bola_pay_control/:id
router.delete('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`DELETE FROM bola_pay_control WHERE id = $1 RETURNING *`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.status(204).send();
  } catch (err) {
    console.error('Delete bola_pay_control error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
