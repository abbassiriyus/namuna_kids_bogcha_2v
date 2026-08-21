const express = require('express');
const router = express.Router();
const pool = require('../db');

router.post('/', async (req, res) => {
  const { holati, bola_id, darssana_id } = req.body;

  try {
    // 1. Bugungi sana
    const today = new Date().toISOString().slice(0, 10);

    // 2. Dars sanasini tekshiramiz
    const check = await pool.query(`SELECT sana FROM bola_kuni_all WHERE id = $1`, [darssana_id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Dars topilmadi' });
    }
    const darsSana = check.rows[0].sana.toISOString().slice(0, 10);
    if (darsSana !== today) {
      return res.status(403).json({ error: 'Faqat bugungi dars uchun davomat kiritish mumkin' });
    }

    // 3. Kiritish
    const result = await pool.query(
      `INSERT INTO bola_kun (holati, bola_id, darssana_id) VALUES ($1, $2, $3) RETURNING *`,
      [holati, bola_id, darssana_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create bola_kun error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET ALL (with optional month filter) - GET /bola_kun?month=YYYY-MM
router.get('/', async (req, res) => {
  const { month } = req.query;
  try {
    if (month) {
      const [year, monthNum] = month.split('-');
      const startDate = `${month}-01`;

      // JS: yangi oy 0-indeksli, shuning uchun (monthNum) emas (monthNum - 1)
      const endDateObj = new Date(year, parseInt(monthNum), 0); // 0 => oldingi oyning oxirgi kuni
      const endDate = endDateObj.toISOString().slice(0, 10);

      const result = await pool.query(
        `SELECT * FROM bola_kun WHERE created_at BETWEEN $1 AND $2 ORDER BY created_at DESC`,
        [startDate, endDate]
      );
      return res.json(result.rows);
    }

    const result = await pool.query(`SELECT * FROM bola_kun ORDER BY created_at DESC`);
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch bola_kun error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


// GET ONE - GET /bola_kun/:id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`SELECT * FROM bola_kun WHERE id = $1`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Fetch bola_kun by id error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { holati, bola_id, darssana_id } = req.body;

  try {
    const today = new Date().toISOString().slice(0, 10);

    // 1. Dars sanasini tekshiramiz
    const check = await pool.query(`SELECT sana FROM bola_kuni_all WHERE id = $1`, [darssana_id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Dars topilmadi' });
    }
    const darsSana = check.rows[0].sana.toISOString().slice(0, 10);
    if (darsSana !== today) {
      return res.status(403).json({ error: 'Faqat bugungi dars uchun davomat yangilanishi mumkin' });
    }

    // 2. Yangilash
    const result = await pool.query(
      `UPDATE bola_kun SET holati = $1, bola_id = $2, darssana_id = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *`,
      [holati, bola_id, darssana_id, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update bola_kun error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


// DELETE - DELETE /bola_kun/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`DELETE FROM bola_kun WHERE id = $1 RETURNING *`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error('Delete bola_kun error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
