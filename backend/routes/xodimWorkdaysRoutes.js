const express = require('express');
const router = express.Router();
const pool = require('../db');
const verifyToken = require('../middleware/verifyToken');

// GET /xodim_workdays — barcha xodimlarning belgilangan ish kunlari
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM xodim_workdays ORDER BY work_day DESC`);
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
