// routes/taom.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// CREATE
router.post('/', async (req, res) => {
  const { nomi } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO taom (nomi) VALUES ($1) RETURNING *',
      [nomi]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});
router.get('/:taomId/ingredient', async (req, res) => {
  const { taomId } = req.params;
  try {
    const result = await db.query(`
      SELECT ti.id, ti.sklad_product_id, ti.miqdor,s.hajm_birlik, s.nomi
      FROM taom_ingredient ti
      JOIN sklad_product s ON ti.sklad_product_id = s.id
      WHERE ti.taom_id = $1
      ORDER BY ti.id DESC
    `, [taomId]);

    res.json(result.rows);
  } catch (err) {
    console.error('GET ingredient error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});
router.post('/:taomId/ingredient', async (req, res) => {
  const { taomId } = req.params;
  const { sklad_product_id, miqdor } = req.body;

  if (!sklad_product_id || !miqdor) {
    return res.status(400).json({ error: 'Barcha maydonlar to‘ldirilishi kerak' });
  }

  try {
    const result = await db.query(`
      INSERT INTO taom_ingredient (taom_id, sklad_product_id, miqdor)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [taomId, sklad_product_id, miqdor]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('POST /taom/:taomId/ingredient error:', err);
    res.status(500).json({ error: 'Serverda xatolik' });
  }
});

// POST /taom/ishlatish
router.post('/ishlatish', async (req, res) => {
  const { taom_id, sana, bolalar_soni } = req.body;

  try {
    // 1. Ingredientlarni olish
    const result = await db.query(`
      SELECT sklad_product_id, miqdor 
      FROM taom_ingredient 
      WHERE taom_id = $1
    `, [taom_id]);

    const ingredients = result.rows;

    // 2. Har bir ingredient uchun hajm = miqdor * bolalar_soni
    for (let ing of ingredients) {
      const hajm = ing.miqdor * bolalar_soni;

      await db.query(`
        INSERT INTO chiqim_ombor (hajm, sklad_product_id, description, chiqim_sana)
        VALUES ($1, $2, $3, $4)
      `, [
        hajm,
        ing.sklad_product_id,
        `Taom ID: ${taom_id} bo‘yicha ${bolalar_soni} bola uchun`,
        sana
      ]);
    }

    res.status(200).json({ message: "Mahsulotlar chiqim_ombor jadvaliga saqlandi" });
  } catch (error) {
    console.error("Server xatolik:", error);
    res.status(500).json({ error: "Chiqim yozishda xatolik" });
  }
});

// READ ALL
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM taom ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// READ ONE
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT * FROM taom WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// UPDATE
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nomi } = req.body;
  try {
    const result = await db.query(
      'UPDATE taom SET nomi = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [nomi, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM taom WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
