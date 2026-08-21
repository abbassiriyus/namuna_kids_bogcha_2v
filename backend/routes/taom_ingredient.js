// routes/taom_ingredient.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// CREATE
router.post('/', async (req, res) => {
  const { sklad_product_id, miqdor,taom_id } = req.body;
  try {
    const result = await db.query(
      `INSERT INTO taom_ingredient (sklad_product_id, miqdor,taom_id)
       VALUES ($1, $2,$3)
       RETURNING *`,
      [sklad_product_id, miqdor,taom_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating taom_ingredient:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// READ ALL
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM taom_ingredient ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching taom_ingredient list:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// READ ONE
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT * FROM taom_ingredient WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching taom_ingredient:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// UPDATE
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { sklad_product_id, miqdor,taom_id } = req.body;
  try {
    const result = await db.query(
      `UPDATE taom_ingredient
       SET sklad_product_id = $1,
           miqdor = $2,
           taom_id=$3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [sklad_product_id, miqdor,taom_id, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating taom_ingredient:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM taom_ingredient WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error('Error deleting taom_ingredient:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
