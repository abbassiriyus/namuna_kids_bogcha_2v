import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function handler(req, res) {
  if (req.method === 'GET') {
    const { admin_id } = req.query;
    try {
      let query = 'SELECT * FROM group_admin';
      const params = [];
      if (admin_id) {
        query += ' WHERE admin_id = $1';
        params.push(admin_id);
      }
      const result = await pool.query(query, params);
      return res.status(200).json(result.rows);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    const { admin_id, group_id } = req.body;
    try {
      const result = await pool.query(
        `INSERT INTO group_admin (admin_id, group_id) VALUES ($1, $2)
         ON CONFLICT (admin_id, group_id) DO NOTHING
         RETURNING *`,
        [admin_id, group_id]
      );
      return res.status(201).json(result.rows[0] || { admin_id, group_id });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default requireAuth(handler);
