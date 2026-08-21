const express = require('express');
const path = require('path');
const router = express.Router();
const pool = require('../db');
const verifyToken = require('../middleware/verifyToken');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

async function saveImage(file) {
  const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  await file.mv(path.join(UPLOAD_DIR, filename));
  return filename;
}

// ✅ GET — barcha xodimlar
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT x.*, l.name AS lavozim_nomi
      FROM xodim x
      LEFT JOIN lavozim l ON x.lavozim_id = l.id
      ORDER BY x.id DESC
    `);
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET — bugun ishlashi kerak bo‘lgan xodimlar
// ish_tur=1 (davomat bilan) doim, ish_tur=2 (erkin) faqat shu kunga workday belgilangan bo‘lsa
router.get('/work-today', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT x.*, l.name AS lavozim_nomi
      FROM xodim x
      LEFT JOIN lavozim l ON x.lavozim_id = l.id
      WHERE x.ish_tur = 1
         OR EXISTS (
           SELECT 1 FROM xodim_workdays w
           WHERE w.xodim_id = x.id AND w.work_day = CURRENT_DATE
         )
      ORDER BY x.id DESC
    `);
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET — xodimning bir oylik belgilangan ish kunlari
router.get('/:id/workday', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { year, month } = req.query;
  try {
    let query = 'SELECT work_day FROM xodim_workdays WHERE xodim_id = $1';
    const params = [id];
    if (year && month) {
      query += ` AND EXTRACT(YEAR FROM work_day) = $2 AND EXTRACT(MONTH FROM work_day) = $3`;
      params.push(year, month);
    }
    const result = await pool.query(query, params);
    res.status(200).json(result.rows.map(r => r.work_day.toISOString().slice(0, 10)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ POST — xodimga ish kuni qo‘shish
router.post('/:id/workday', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { day } = req.body;
  try {
    await pool.query(
      `INSERT INTO xodim_workdays (xodim_id, work_day) VALUES ($1, $2)
       ON CONFLICT (xodim_id, work_day) DO NOTHING`,
      [id, day]
    );
    res.status(201).json({ message: 'Qo‘shildi' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE — xodimdan ish kun(lar)ini olib tashlash
router.delete('/:id/workday', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { days } = req.body;
  try {
    if (!Array.isArray(days) || days.length === 0) {
      return res.status(400).json({ error: 'days massivi kerak' });
    }
    await pool.query(
      `DELETE FROM xodim_workdays WHERE xodim_id = $1 AND work_day = ANY($2::date[])`,
      [id, days]
    );
    res.status(200).json({ message: 'O‘chirildi' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ POST — yangi xodim qo‘shish
router.post('/', verifyToken, async (req, res) => {
  const { name, phone, lavozim_id, address, oylik, ish_tur, start_time, end_time } = req.body;
  try {
    let image = null;
    if (req.files && req.files.image) {
      image = await saveImage(req.files.image);
    }
    const result = await pool.query(
      `INSERT INTO xodim (name, phone, lavozim_id, address, oylik, ish_tur, start_time, end_time, image)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [name, phone, lavozim_id, address, oylik, ish_tur || 1, start_time || null, end_time || null, image]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ PUT — xodim ma’lumotlarini yangilash
router.put('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { name, phone, lavozim_id, address, oylik, ish_tur, start_time, end_time } = req.body;

  try {
    let imageClause = '';
    const params = [name, phone, lavozim_id, address, oylik, ish_tur || 1, start_time || null, end_time || null];

    if (req.files && req.files.image) {
      const image = await saveImage(req.files.image);
      params.push(image);
      imageClause = `, image = $${params.length}`;
    }
    params.push(id);

    const result = await pool.query(
      `UPDATE xodim
       SET name = $1, phone = $2, lavozim_id = $3, address = $4, oylik = $5,
           ish_tur = $6, start_time = $7, end_time = $8, updated_at = CURRENT_TIMESTAMP${imageClause}
       WHERE id = $${params.length}
       RETURNING *`,
      params
    );
    res.status(200).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE — xodimni o‘chirish
router.delete('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM xodim WHERE id = $1', [id]);
    res.status(204).send(); // No Content
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
