const express = require('express');
const router = express.Router();
const pool = require('../db');
const verifyToken = require('../middleware/verifyToken');

// GET barcha maishiy ombor mahsulotlari
router.get('/',verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sklad_maishiy ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Maʼlumotlarni olishda xatolik' });
  }
});
// 📊 GET: Omborda maishiy mahsulot hajmi
router.get('/:id/hajm', verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    const kirim = await pool.query(
      `SELECT COALESCE(SUM(hajm), 0) AS kirim FROM kirim_maishiy WHERE sklad_maishiy_id = $1`,
      [id]
    );
    const chiqim = await pool.query(
      `SELECT COALESCE(SUM(hajm), 0) AS chiqim FROM chiqim_maishiy WHERE sklad_maishiy_id = $1`,
      [id]
    );

    const mavjud = kirim.rows[0].kirim - chiqim.rows[0].chiqim;

    res.json({ mavjud });
  } catch (err) {
    console.error("Mavjud hajm hisobida xatolik:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST - yangi mahsulot qo‘shish
router.post('/',verifyToken, async (req, res) => {
  const { nomi, hajm, hajm_birlik } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO sklad_maishiy (nomi, hajm, hajm_birlik)
       VALUES ($1, $2, $3) RETURNING *`,
      [nomi, hajm, hajm_birlik]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Yaratishda xatolik' });
  }
});

// PUT - tahrirlash
router.put('/:id',verifyToken, async (req, res) => {
  const { id } = req.params;
  const { nomi, hajm, hajm_birlik } = req.body;
  try {
    const result = await pool.query(
      `UPDATE sklad_maishiy SET
         nomi = $1,
         hajm = $2,
         hajm_birlik = $3,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING *`,
      [nomi, hajm, hajm_birlik, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Tahrirlashda xatolik' });
  }
});

// DELETE - o‘chirish
router.delete('/:id',verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM sklad_maishiy WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'O‘chirishda xatolik' });
  }
});

module.exports = router;
