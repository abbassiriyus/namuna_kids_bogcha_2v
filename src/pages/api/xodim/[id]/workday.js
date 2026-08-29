import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { monthRangeDate, isMonth } from '@/lib/sqlDate';

async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    const { year, month } = req.query;
    try {
      let query = 'SELECT work_day FROM xodim_workdays WHERE xodim_id = $1';
      const params = [id];
      if (year && month) {
        // EXTRACT(...) ustun ustidan funksiya — indeks ishlamaydi. Oy oralig'i
        // bir xil natija beradi va (xodim_id, work_day) indeksidan foydalanadi.
        const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
        if (!isMonth(yearMonth)) {
          return res.status(400).json({ error: 'year/month noto‘g‘ri' });
        }
        params.push(yearMonth);
        query += ` AND ${monthRangeDate('work_day', params.length)}`;
      }
      const result = await pool.query(query, params);
      return res.status(200).json(result.rows.map(r => r.work_day.toISOString().slice(0, 10)));
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    const { day } = req.body;
    try {
      await pool.query(
        `INSERT INTO xodim_workdays (xodim_id, work_day) VALUES ($1, $2)
         ON CONFLICT (xodim_id, work_day) DO NOTHING`,
        [id, day]
      );
      return res.status(201).json({ message: 'Qo‘shildi' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'DELETE') {
    const { days } = req.body;
    try {
      if (!Array.isArray(days) || days.length === 0) {
        return res.status(400).json({ error: 'days massivi kerak' });
      }
      await pool.query(
        `DELETE FROM xodim_workdays WHERE xodim_id = $1 AND work_day = ANY($2::date[])`,
        [id, days]
      );
      return res.status(200).json({ message: 'O‘chirildi' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default requireAuth(handler);
