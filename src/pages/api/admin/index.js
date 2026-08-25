import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function handler(req, res) {
  if (req.method === 'POST') {
    const { username, phone_number, type, description, password, is_active } = req.body;
    try {
      const result = await pool.query(
        `INSERT INTO admin (username, phone_number, type, description, password, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [username, phone_number, type, description, password, is_active]
      );
      return res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'GET') {
    const { type } = req.query;
    try {
      const result = type
        ? await pool.query(`SELECT * FROM admin WHERE type = $1 ORDER BY id DESC`, [type])
        : await pool.query(`SELECT * FROM admin ORDER BY id DESC`);
      return res.status(200).json(result.rows);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default requireAuth(handler);
