import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function handler(req, res) {
  const { adminId } = req.query;

  if (req.method === 'GET') {
    try {
      const result = await pool.query(
        'SELECT data FROM permissions WHERE admin_id = $1',
        [adminId]
      );
      return res.status(200).json({ permissions: result.rows[0]?.data || {} });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    const { permissions } = req.body;
    try {
      const result = await pool.query(
        `INSERT INTO permissions (admin_id, data)
         VALUES ($1, $2)
         ON CONFLICT (admin_id)
         DO UPDATE SET data = $2, updated_at = CURRENT_TIMESTAMP
         RETURNING data`,
        [adminId, permissions || {}]
      );
      return res.status(200).json({ permissions: result.rows[0].data });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default requireAuth(handler);
