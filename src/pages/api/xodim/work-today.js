import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const result = await pool.query(`
      SELECT DISTINCT x.*, l.name AS lavozim_nomi
      FROM xodim x
      LEFT JOIN lavozim l ON x.lavozim_id = l.id
      WHERE x.ish_tur = 1
         OR EXISTS (
           SELECT 1 FROM xodim_workdays w
           WHERE w.xodim_id = x.id AND w.work_day = CURRENT_DATE
         )
      ORDER BY x.id DESC
    `);
    return res.status(200).json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export default requireAuth(handler);
