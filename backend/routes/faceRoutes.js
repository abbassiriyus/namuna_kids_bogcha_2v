const express = require('express');
const router = express.Router();
const pool = require('../db');
const verifyToken = require('../middleware/verifyToken');

const MATCH_THRESHOLD = 0.6; // face-api.js tavsiya etadigan standart chegara

function euclideanDistance(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += (a[i] - b[i]) ** 2;
  }
  return Math.sqrt(sum);
}

// POST /api/xodim/:id/face — xodim uchun yuz descriptorini saqlash (ro'yxatdan o'tkazish)
router.post('/xodim/:id/face', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { descriptor } = req.body;

  if (!Array.isArray(descriptor) || descriptor.length === 0) {
    return res.status(400).json({ message: 'descriptor massivi kerak' });
  }

  try {
    const result = await pool.query(
      `UPDATE xodim SET face_descriptor = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name`,
      [JSON.stringify(descriptor), id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Xodim topilmadi' });
    res.status(200).json({ message: 'Yuz saqlandi', xodim: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/check-face — kameradan olingan descriptorni bazadagi xodimlar bilan solishtirish
router.post('/check-face', async (req, res) => {
  const { descriptor } = req.body;

  if (!Array.isArray(descriptor) || descriptor.length === 0) {
    return res.status(400).json({ message: 'descriptor massivi kerak' });
  }

  try {
    const result = await pool.query(
      `SELECT id, name, face_descriptor FROM xodim WHERE face_descriptor IS NOT NULL`
    );

    let best = null;
    let bestDistance = Infinity;

    for (const row of result.rows) {
      const stored = row.face_descriptor;
      if (!Array.isArray(stored) || stored.length !== descriptor.length) continue;

      const distance = euclideanDistance(descriptor, stored);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = row;
      }
    }

    if (!best || bestDistance >= MATCH_THRESHOLD) {
      return res.status(200).json({ match: null });
    }

    const openRecord = await pool.query(
      `SELECT * FROM xodim_one_day
       WHERE xodim_id = $1 AND created_at::date = CURRENT_DATE
       ORDER BY created_at DESC LIMIT 1`,
      [best.id]
    );
    const todayRecord = openRecord.rows[0] || null;

    res.status(200).json({
      match: { id: best.id, name: best.name },
      distance: bestDistance,
      todayStatus: {
        state: !todayRecord ? 'none' : (todayRecord.end_time ? 'done' : 'open'),
        startTime: todayRecord?.start_time || null,
        endTime: todayRecord?.end_time || null,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/yolama — tanilgan xodim uchun kelish/ketish vaqtini belgilash
// action ('kelish'|'ketish') berilsa aniq shu amal bajariladi; berilmasa avtomatik almashtiriladi
router.post('/yolama', async (req, res) => {
  const { xodim_id, action } = req.body;

  if (!xodim_id) return res.status(400).json({ message: 'xodim_id kerak' });

  try {
    const openRecord = await pool.query(
      `SELECT * FROM xodim_one_day
       WHERE xodim_id = $1 AND created_at::date = CURRENT_DATE
       ORDER BY created_at DESC LIMIT 1`,
      [xodim_id]
    );
    const record = openRecord.rows[0] || null;
    const isOpen = !!(record && record.start_time && !record.end_time);

    if (action === 'kelish') {
      if (isOpen) return res.status(409).json({ message: 'Xodim allaqachon ishga kelgan' });
      const inserted = await pool.query(
        `INSERT INTO xodim_one_day (xodim_id, start_time) VALUES ($1, CURRENT_TIME) RETURNING *`,
        [xodim_id]
      );
      return res.status(201).json({ action: 'kelish', record: inserted.rows[0] });
    }

    if (action === 'ketish') {
      if (!isOpen) return res.status(409).json({ message: 'Xodimning ochiq kelish yozuvi topilmadi' });
      const updated = await pool.query(
        `UPDATE xodim_one_day SET end_time = CURRENT_TIME, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 RETURNING *`,
        [record.id]
      );
      return res.status(200).json({ action: 'ketish', record: updated.rows[0] });
    }

    // action berilmagan — avtomatik almashtirish (eski xulq-atvor)
    if (!record) {
      const inserted = await pool.query(
        `INSERT INTO xodim_one_day (xodim_id, start_time) VALUES ($1, CURRENT_TIME) RETURNING *`,
        [xodim_id]
      );
      return res.status(201).json({ action: 'kelish', record: inserted.rows[0] });
    }

    if (isOpen) {
      const updated = await pool.query(
        `UPDATE xodim_one_day SET end_time = CURRENT_TIME, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 RETURNING *`,
        [record.id]
      );
      return res.status(200).json({ action: 'ketish', record: updated.rows[0] });
    }

    const inserted = await pool.query(
      `INSERT INTO xodim_one_day (xodim_id, start_time) VALUES ($1, CURRENT_TIME) RETURNING *`,
      [xodim_id]
    );
    res.status(201).json({ action: 'kelish', record: inserted.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/xodim/:id/today-undo — yuz orqali belgilangan bugungi yozuvni bekor qilish
// (xato bosilib qolgan holatlar uchun; kiosk ekranida token talab qilinmaydi)
// ?scope=end  -> faqat ketish (end_time) vaqti bekor qilinadi, kelish vaqti saqlanib qoladi
// ?scope=all yoki berilmasa -> butun kunlik yozuv o'chiriladi (kelish ham, ketish ham)
router.delete('/xodim/:id/today-undo', async (req, res) => {
  const { id } = req.params;
  const { scope } = req.query;
  try {
    const openRecord = await pool.query(
      `SELECT * FROM xodim_one_day
       WHERE xodim_id = $1 AND created_at::date = CURRENT_DATE
       ORDER BY created_at DESC LIMIT 1`,
      [id]
    );
    const record = openRecord.rows[0];
    if (!record) return res.status(404).json({ message: 'Bugungi yozuv topilmadi' });

    if (scope === 'end') {
      if (!record.end_time) {
        return res.status(409).json({ message: 'Ketish vaqti hali belgilanmagan' });
      }
      const updated = await pool.query(
        `UPDATE xodim_one_day SET end_time = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 RETURNING *`,
        [record.id]
      );
      return res.status(200).json({ message: 'Ketish vaqti bekor qilindi', record: updated.rows[0] });
    }

    const result = await pool.query(
      `DELETE FROM xodim_one_day WHERE id = $1 RETURNING *`,
      [record.id]
    );
    res.status(200).json({ message: 'Bekor qilindi', record: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/today-roster — Face ID kioski uchun: barcha xodimlar va ularning
// bugungi kelish/ketish vaqti bitta so'rovda. Kiosk ekranida token bo'lmagani
// uchun (check-face, yolama kabi) tokensiz ishlaydi va faqat ko'rsatish uchun
// zarur maydonlarni qaytaradi — telefon, manzil, oylik kabi shaxsiy
// ma'lumotlar bu yerda umuman yuborilmaydi.
router.get('/today-roster', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT x.id,
              x.name,
              x.ish_tur,
              x.start_time  AS plan_start,
              x.end_time    AS plan_end,
              d.start_time  AS kelgan,
              d.end_time    AS ketgan,
              (x.face_descriptor IS NOT NULL) AS face_bor
       FROM xodim x
       LEFT JOIN LATERAL (
         SELECT start_time, end_time
         FROM xodim_one_day
         WHERE xodim_id = x.id AND created_at::date = CURRENT_DATE
         ORDER BY created_at DESC
         LIMIT 1
       ) d ON TRUE
       ORDER BY x.name`
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('today-roster xatolik:', err.message);
    res.status(500).json({ error: "Xodimlar ro'yxatini olishda xatolik" });
  }
});

module.exports = router;
