const express = require('express');
const router = express.Router();
const pool = require('../db');
const verifyToken = require('../middleware/verifyToken');

// GET /davomat-settings — joriy davomat rejimini olish (kiosk sahifasi login talab qilmasdan o'qiy oladi)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`SELECT mode FROM davomat_settings ORDER BY id LIMIT 1`);
    res.status(200).json({ mode: result.rows[0]?.mode || 'button' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /davomat-settings — rejimni o'zgartirish, faqat superadmin (type === 1)
router.put('/', verifyToken, async (req, res) => {
  if (req.user.type !== 1) {
    return res.status(403).json({ message: 'Faqat super admin davomat rejimini o‘zgartira oladi' });
  }

  const { mode } = req.body;
  if (mode !== 'button' && mode !== 'face') {
    return res.status(400).json({ message: 'mode "button" yoki "face" bo‘lishi kerak' });
  }

  try {
    const result = await pool.query(
      `UPDATE davomat_settings SET mode = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = (SELECT id FROM davomat_settings ORDER BY id LIMIT 1)
       RETURNING mode`,
      [mode]
    );
    if (result.rows.length === 0) {
      const inserted = await pool.query(
        `INSERT INTO davomat_settings (mode) VALUES ($1) RETURNING mode`,
        [mode]
      );
      return res.status(200).json({ mode: inserted.rows[0].mode });
    }
    res.status(200).json({ mode: result.rows[0].mode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
