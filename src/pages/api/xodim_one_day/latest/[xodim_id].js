import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function handler(req, res) {
  const { xodim_id } = req.query;

  if (req.method === 'GET') {
    try {
      const result = await pool.query(
        `SELECT * FROM xodim_one_day WHERE xodim_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [xodim_id]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: 'Yozuv topilmadi' });
      return res.status(200).json(result.rows[0]);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const result = await pool.query(
        `DELETE FROM xodim_one_day
         WHERE id = (
           SELECT id FROM xodim_one_day WHERE xodim_id = $1 ORDER BY created_at DESC LIMIT 1
         )
         RETURNING *`,
        [xodim_id]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: 'Yozuv topilmadi' });
      return res.status(204).end();
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', ['GET', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default requireAuth(handler);
