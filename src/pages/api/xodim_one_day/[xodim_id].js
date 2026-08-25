import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function handler(req, res) {
  const { xodim_id } = req.query;

  if (req.method === 'PUT') {
    const { end_time } = req.body;
    try {
      const result = await pool.query(
        `UPDATE xodim_one_day SET end_time = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = (
           SELECT id FROM xodim_one_day
           WHERE xodim_id = $2 AND created_at::date = CURRENT_DATE
           ORDER BY created_at DESC LIMIT 1
         )
         RETURNING *`,
        [end_time, xodim_id]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: 'Bugungi yozuv topilmadi' });
      return res.status(200).json(result.rows[0]);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', ['PUT']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default requireAuth(handler);
