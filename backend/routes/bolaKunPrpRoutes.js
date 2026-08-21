const express = require('express');
const router = express.Router();
const pool = require('../db');
const verifyToken = require('../middleware/verifyToken');

// GET ALL - GET /bola_kun_prp
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM bola_kun_prp ORDER BY created_at DESC`);
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch bola_kun_prp error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET ONE - GET /bola_kun_prp/:id
router.get('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`SELECT * FROM bola_kun_prp WHERE id = $1`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Fetch bola_kun_prp by id error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// CREATE - POST /bola_kun_prp
router.post('/', verifyToken, async (req, res) => {
  const { holati, bola_id, darssana_id } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO bola_kun_prp (holati, bola_id, darssana_id) VALUES ($1, $2, $3) RETURNING *`,
      [holati, bola_id, darssana_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create bola_kun_prp error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// UPDATE - PUT /bola_kun_prp/:id
router.put('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { holati, bola_id, darssana_id } = req.body;
  try {
    const result = await pool.query(
      `UPDATE bola_kun_prp SET holati = $1, bola_id = $2, darssana_id = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *`,
      [holati, bola_id, darssana_id, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update bola_kun_prp error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE - DELETE /bola_kun_prp/:id
router.delete('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`DELETE FROM bola_kun_prp WHERE id = $1 RETURNING *`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error('Delete bola_kun_prp error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
