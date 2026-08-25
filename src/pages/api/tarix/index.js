import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const result = await pool.query('SELECT * FROM tarix ORDER BY id DESC');
      return res.status(200).json(result.rows);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    const { admin_username, method, table_name, izoh } = req.body;
    try {
      const result = await pool.query(
        `INSERT INTO tarix (admin_username, method, table_name, izoh)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [admin_username, method, table_name, izoh]
      );
      return res.status(201).json(result.rows[0]);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default requireAuth(handler);
