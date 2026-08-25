import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function handler(req, res) {
  if (req.method === 'GET') {
    const { xodim_id, month } = req.query;
    const conditions = [];
    const params = [];

    if (xodim_id) {
      params.push(xodim_id);
      conditions.push(`xodim_id = $${params.length}`);
    }
    if (month) {
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({ error: 'month noto‘g‘ri (YYYY-MM kutiladi)' });
      }
      params.push(month);
      conditions.push(`TO_CHAR(work_day, 'YYYY-MM') = $${params.length}`);
    }

    const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';

    try {
      const result = await pool.query(
        `SELECT * FROM xodim_workdays${where} ORDER BY work_day DESC`,
        params
      );
      return res.status(200).json(result.rows);
    } catch (err) {
      console.error('xodim_workdays olishda xatolik:', err.message);
      return res.status(500).json({ error: 'Ish kunlarini olishda xatolik' });
    }
  }

  res.setHeader('Allow', ['GET']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default requireAuth(handler);
