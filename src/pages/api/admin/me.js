import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const result = await pool.query(
        `SELECT id, username, phone_number, type, description, is_active, created_at, updated_at
         FROM admin WHERE id = $1`,
        [req.user.id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Admin topilmadi' });
      }
      return res.status(200).json(result.rows[0]);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'PUT') {
    const { username, phone_number, description, password } = req.body;
    try {
      let query = `UPDATE admin SET username = $1, phone_number = $2, description = $3, updated_at = CURRENT_TIMESTAMP`;
      const params = [username, phone_number, description ?? null];

      if (password) {
        params.push(password);
        query += `, password = $${params.length}`;
      }

      params.push(req.user.id);
      query += ` WHERE id = $${params.length} RETURNING id, username, phone_number, type, description, is_active`;

      const result = await pool.query(query, params);
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Admin topilmadi' });
      }
      return res.status(200).json(result.rows[0]);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', ['GET', 'PUT']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default requireAuth(handler);
