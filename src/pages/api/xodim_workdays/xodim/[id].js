import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({ error: 'Xodim id noto‘g‘ri' });
    }
    try {
      const result = await pool.query(
        `SELECT * FROM xodim_workdays WHERE xodim_id = $1 ORDER BY work_day DESC`,
        [id]
      );
      return res.status(200).json(result.rows);
    } catch (err) {
      console.error('xodim_workdays (xodim bo‘yicha) xatolik:', err.message);
      return res.status(500).json({ error: 'Ish kunlarini olishda xatolik' });
    }
  }

  res.setHeader('Allow', ['GET']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default requireAuth(handler);
