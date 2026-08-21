const express = require('express');
const router = express.Router();
const pool = require('../db');
const verifyToken = require('../middleware/verifyToken');

// GET /xodim_one_day — barcha yozuvlar
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM xodim_one_day ORDER BY created_at DESC`);
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /xodim_one_day/latest/:xodim_id — shu xodimning oxirgi yozuvi
router.get('/latest/:xodim_id', verifyToken, async (req, res) => {
  const { xodim_id } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM xodim_one_day WHERE xodim_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [xodim_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Yozuv topilmadi' });
    res.status(200).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /xodim_one_day — ishga kelish (start_time)
router.post('/', verifyToken, async (req, res) => {
  const { xodim_id, xodim_workdays_id, start_time } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO xodim_one_day (xodim_id, xodim_workdays_id, start_time) VALUES ($1, $2, $3) RETURNING *`,
      [xodim_id, xodim_workdays_id || null, start_time]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /xodim_one_day/:xodim_id — ishdan ketish (end_time), bugungi ochiq yozuvga yoziladi
router.put('/:xodim_id', verifyToken, async (req, res) => {
  const { xodim_id } = req.params;
  const { end_time } = req.body;
  try {
    const result = await pool.query(
      `UPDATE xodim_one_day SET end_time = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = (
         SELECT id FROM xodim_one_day
         WHERE xodim_id = $2 AND created_at::date = CURRENT_DATE
         ORDER BY created_at DESC LIMIT 1
       )
       RETURNING *`,
      [end_time, xodim_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Bugungi yozuv topilmadi' });
    res.status(200).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /xodim_one_day/latest/:xodim_id/endtime-null
router.put('/latest/:xodim_id/endtime-null', verifyToken, async (req, res) => {
  const { xodim_id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE xodim_one_day SET end_time = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = (
         SELECT id FROM xodim_one_day WHERE xodim_id = $1 ORDER BY created_at DESC LIMIT 1
       )
       RETURNING *`,
      [xodim_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Yozuv topilmadi' });
    res.status(200).json({ message: 'OK', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /xodim_one_day/latest/:xodim_id
router.delete('/latest/:xodim_id', verifyToken, async (req, res) => {
  const { xodim_id } = req.params;
  try {
    const result = await pool.query(
      `DELETE FROM xodim_one_day
       WHERE id = (
         SELECT id FROM xodim_one_day WHERE xodim_id = $1 ORDER BY created_at DESC LIMIT 1
       )
       RETURNING *`,
      [xodim_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Yozuv topilmadi' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
