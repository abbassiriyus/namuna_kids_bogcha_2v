const express = require('express');
const router = express.Router();
const pool = require('../db');
const verifyToken = require('../middleware/verifyToken');

// 📥 GET: barcha sinov bolalar (filtersiz alias)
router.get('/all', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM bola_prp ORDER BY id DESC');
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📥 GET: barcha sinov bolalar
router.get('/', verifyToken, async (req, res) => {
  const { is_active } = req.query;

  try {
    let query = 'SELECT * FROM bola_prp';
    let params = [];

    if (is_active !== undefined) {
      query += ' WHERE is_active = $1';
      params.push(is_active === 'true' ? true : false);
    }

    query += ' ORDER BY id DESC';

    const result = await pool.query(query, params);
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📥 GET: bitta sinov bola
router.get('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM bola_prp WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.status(200).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ➕ POST: yangi sinov bola qo‘shish
router.post('/', verifyToken, async (req, res) => {
  const {
    username,
    metrka,
    guruh_id,
    tugilgan_kun,
    oylik_toliv,
    balans,
    holati,
    ota_fish,
    ota_phone,
    ota_pasport,
    ona_fish,
    ona_phone,
    ona_pasport,
    qoshimcha_phone,
    address,
    description
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO bola_prp (
        username, metrka, guruh_id, tugilgan_kun, oylik_toliv, balans, holati,
        ota_fish, ota_phone, ota_pasport, ona_fish, ona_phone, ona_pasport,
        qoshimcha_phone, address, description
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13,
        $14, $15, $16
      ) RETURNING *`,
      [
        username, metrka, guruh_id, tugilgan_kun, oylik_toliv, balans, holati || 'boshlangich',
        ota_fish, ota_phone, ota_pasport, ona_fish, ona_phone, ona_pasport,
        qoshimcha_phone, address, description
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✏️ PUT: sinov bolani yangilash
router.put('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const {
    username,
    metrka,
    guruh_id,
    tugilgan_kun,
    oylik_toliv,
    balans,
    holati,
    ota_fish,
    ota_phone,
    ota_pasport,
    ona_fish,
    ona_phone,
    ona_pasport,
    qoshimcha_phone,
    address,
    description,
    is_active
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE bola_prp SET
        username = $1,
        metrka = $2,
        guruh_id = $3,
        tugilgan_kun = $4,
        oylik_toliv = $5,
        balans = $6,
        holati = $7,
        ota_fish = $8,
        ota_phone = $9,
        ota_pasport = $10,
        ona_fish = $11,
        ona_phone = $12,
        ona_pasport = $13,
        qoshimcha_phone = $14,
        address = $15,
        description = $16,
        is_active = COALESCE($17, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $18
      RETURNING *`,
      [
        username, metrka, guruh_id, tugilgan_kun, oylik_toliv, balans, holati,
        ota_fish, ota_phone, ota_pasport, ona_fish, ona_phone, ona_pasport,
        qoshimcha_phone, address, description, is_active, id
      ]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.status(200).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔁 PUT: is_active holatini almashtirish
router.put('/:id/toggle-active', verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('SELECT is_active FROM bola_prp WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Tarbiyalanuvchi topilmadi' });
    }

    const current = result.rows[0].is_active;
    const updated = !current;

    await pool.query('UPDATE bola_prp SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [updated, id]);

    res.json({ message: 'Holat muvaffaqiyatli yangilandi', is_active: updated });
  } catch (err) {
    console.error('Toggle is_active xatolik:', err);
    res.status(500).json({ message: 'Server xatosi' });
  }
});

// ⏭️ PUT: sinov bosqichini (holati) yangilash
router.put('/:id/next-stage', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { holati } = req.body;

  try {
    const result = await pool.query(
      `UPDATE bola_prp SET holati = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [holati, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.status(200).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ❌ DELETE: sinov bolani o‘chirish
router.delete('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM bola_prp WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
