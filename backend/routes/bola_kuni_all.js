const express = require('express');
const router = express.Router();
const pool = require('../db'); // PostgreSQL poolni chaqiramiz

// CREATE - POST /bola_kuni_all
router.post('/', async (req, res) => {
  const { sana, mavzu } = req.body;
  try {
    const result = await pool.query(`
      INSERT INTO bola_kuni_all (sana, mavzu) VALUES ($1, $2) RETURNING *
    `, [sana, mavzu]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// GET /bola_kuni_all?month=YYYY-MM
router.get('/', async (req, res) => {
  const { month, year } = req.query;
  try {
    const result = await pool.query(`
      SELECT * FROM bola_kuni_all
      WHERE EXTRACT(MONTH FROM sana) = $1 AND EXTRACT(YEAR FROM sana) = $2
    `, [month, year]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// READ ONE - GET /bola_kuni_all/:id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`SELECT * FROM bola_kuni_all WHERE id = $1`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('bola_kuni_all fetch by id error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// UPDATE - PUT /bola_kuni_all/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { mavzu, sana } = req.body;
  try {
    const result = await pool.query(
      `UPDATE bola_kuni_all SET mavzu = $1, sana = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *`,
      [mavzu, sana, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('bola_kuni_all update error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/', async (req, res) => {
  const { sana } = req.body;
  try {
    const result = await pool.query(`
      DELETE FROM bola_kuni_all WHERE sana = $1 RETURNING *
    `, [sana]);
    res.json({ message: 'Deleted', date: sana });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



module.exports = router;
