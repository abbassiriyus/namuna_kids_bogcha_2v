const express = require('express');
const router = express.Router();
const pool = require('../db'); // PostgreSQL poolni chaqiramiz

// CREATE - POST /darssana
router.post('/', async (req, res) => {
  const { mavzu, sana } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO darssana (mavzu, sana) VALUES ($1, $2) RETURNING *`,
      [mavzu, sana]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Darssana create error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


// GET /darssana?month=YYYY-MM
router.get('/', async (req, res) => {
  const { month } = req.query;

  try {
    if (month) {
      // month formatini tekshirish (YYYY-MM)
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({ error: 'Invalid month format. Use YYYY-MM.' });
      }

      const year = month.split('-')[0];
      const monthNum = parseInt(month.split('-')[1], 10);

      // oydagi maksimal kunni aniqlash
      const lastDay = new Date(year, monthNum, 0).getDate();
      const startDate = `${month}-01`;
      const endDate = `${month}-${lastDay}`;

      const result = await pool.query(
        `SELECT * FROM darssana WHERE sana BETWEEN $1 AND $2 ORDER BY sana DESC`,
        [startDate, endDate]
      );
      return res.json(result.rows);
    }

    // agar month bo‘lmasa, barcha malumot
    const result = await pool.query(`SELECT * FROM darssana ORDER BY sana DESC`);
    res.json(result.rows);
  } catch (err) {
    console.error('Darssana fetch error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


// READ ONE - GET /darssana/:id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`SELECT * FROM darssana WHERE id = $1`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Darssana fetch by id error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// UPDATE - PUT /darssana/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { mavzu, sana } = req.body;
  try {
    const result = await pool.query(
      `UPDATE darssana SET mavzu = $1, sana = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *`,
      [mavzu, sana, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Darssana update error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Avval bola_kun yozuvlarini o‘chiramiz
    await client.query(`DELETE FROM bola_kun WHERE darssana_id = $1`, [id]);

    // So‘ngra darssana ni o‘chiramiz
    const result = await client.query(`DELETE FROM darssana WHERE id = $1 RETURNING *`, [id]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Not found' });
    }

    await client.query('COMMIT');
    res.json({ message: 'Dars va unga bog‘langan davomatlar o‘chirildi' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Darssana delete error:', err.message);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});


module.exports = router;
