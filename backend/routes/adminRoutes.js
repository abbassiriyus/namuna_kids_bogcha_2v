const express = require('express');
const router = express.Router();
const pool = require('../db');
const verifyToken = require('../middleware/verifyToken');

// ✅ CREATE admin
router.post('/', verifyToken, async (req, res) => {
  const { username, phone_number, type, description, password, is_active } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO admin (username, phone_number, type, description, password, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [username, phone_number, type, description, password, is_active]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ READ ALL admins
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM admin ORDER BY id DESC`);
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ READ ONE admin
router.get('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`SELECT * FROM admin WHERE id = $1`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Admin topilmadi' });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ UPDATE admin
router.put('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { username, phone_number, type, description, password, is_active } = req.body;

  try {
    const result = await pool.query(
      `UPDATE admin SET
         username = $1,
         phone_number = $2,
         type = $3,
         description = $4,
         password = $5,
         is_active = $6,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [username, phone_number, type, description, password, is_active, id]
    );
    res.status(200).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// CREATE admin — is_active = true bo‘lsa, token qaytaradi
router.post('/', verifyToken, async (req, res) => {
  const { username, phone_number, type, description, password, is_active } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO admin (username, phone_number, type, description, password, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [username, phone_number, type, description, password, is_active]
    );

    const newAdmin = result.rows[0];

    // ✅ is_active true bo‘lsa, token yaratamiz
    if (newAdmin.is_active) {
      const token = jwt.sign(
        {
          id: newAdmin.id,
          username: newAdmin.username,
          type: newAdmin.type
        },
        SECRET_KEY,
        { expiresIn: '7d' }
      );

      return res.status(201).json({ admin: newAdmin, token });
    }

    res.status(201).json({ admin: newAdmin });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET || 'mysecretkey';

// ✅ LOGIN admin
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query(`SELECT * FROM admin WHERE username = $1`, [username]);

    const admin = result.rows[0];

    if (!admin) {
      return res.status(404).json({ message: "Bunday foydalanuvchi topilmadi" });
    }

    // Faqat aktiv foydalanuvchi login qila oladi
    if (!admin.is_active) {
      return res.status(403).json({ message: "Admin faollashtirilmagan" });
    }

    if (admin.password !== password) {
      return res.status(401).json({ message: "Parol noto'g'ri" });
    }

    const token = jwt.sign(
      {
        id: admin.id,
        username: admin.username,
        type: admin.type,
      },
      SECRET_KEY,
      { expiresIn: '7d' }
    );

    res.status(200).json({ token, admin });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE admin
router.delete('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query(`DELETE FROM admin WHERE id = $1`, [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
