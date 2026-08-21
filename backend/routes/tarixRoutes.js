const express = require('express');
const router = express.Router();
const pool = require('../db');
const verifyToken = require('../middleware/verifyToken');

// 📥 GET — barcha tarix yozuvlari (frontend o‘zi qidiruv/filtr qiladi)
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM tarix ORDER BY id DESC'
    );
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ➕ POST — yangi tarix yozuvi qo‘shish (boshqa route’lar amaldan keyin shu yerga yozishi mumkin)
router.post('/', verifyToken, async (req, res) => {
  const { admin_username, method, table_name, izoh } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO tarix (admin_username, method, table_name, izoh)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [admin_username, method, table_name, izoh]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
