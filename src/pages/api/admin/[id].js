import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const result = await pool.query(`SELECT * FROM admin WHERE id = $1`, [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Admin topilmadi' });
      }
      return res.status(200).json(result.rows[0]);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'PUT') {
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
      return res.status(200).json(result.rows[0]);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await pool.query(`DELETE FROM admin WHERE id = $1`, [id]);
      return res.status(204).end();
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default requireAuth(handler);
