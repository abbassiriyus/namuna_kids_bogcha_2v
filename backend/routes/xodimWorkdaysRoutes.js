const express = require('express');
const router = express.Router();
const pool = require('../db');
const verifyToken = require('../middleware/verifyToken');

// GET /xodim_workdays — barcha xodimlarning belgilangan ish kunlari.
// ?xodim_id= yoki ?month=YYYY-MM bilan filtrlash mumkin — shunda frontend
// har bir xodim uchun alohida so'rov yubormasdan bitta ro'yxat oladi.
router.get('/', verifyToken, async (req, res) => {
  const { xodim_id, month } = req.query;
  const conditions = [];
  const params = [];

  if (xodim_id) {
    params.push(xodim_id);
    conditions.push(`xodim_id = $${params.length}`);
  }
  if (month) {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'month noto‘g‘ri (YYYY-MM kutiladi)' });
    }
    params.push(month);
    conditions.push(`TO_CHAR(work_day, 'YYYY-MM') = $${params.length}`);
  }

  const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';

  try {
    const result = await pool.query(
      `SELECT * FROM xodim_workdays${where} ORDER BY work_day DESC`,
      params
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('xodim_workdays olishda xatolik:', err.message);
    res.status(500).json({ error: 'Ish kunlarini olishda xatolik' });
  }
});

// GET /xodim_workdays/xodim/:id — bitta xodimning ish kunlari.
// Frontend (XodimDavomat) shu manzilni chaqirardi, lekin marshrut yo'q edi —
// natijada 404 qaytardi va davomat jadvali to'liq yuklanmasdi.
router.get('/xodim/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ error: 'Xodim id noto‘g‘ri' });
  }
  try {
    const result = await pool.query(
      `SELECT * FROM xodim_workdays WHERE xodim_id = $1 ORDER BY work_day DESC`,
      [id]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('xodim_workdays (xodim bo‘yicha) xatolik:', err.message);
    res.status(500).json({ error: 'Ish kunlarini olishda xatolik' });
  }
});

module.exports = router;
