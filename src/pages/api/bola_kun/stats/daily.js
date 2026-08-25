import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

const KUN = `a.sana`;

async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const month = req.query.month || new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: 'month noto‘g‘ri (YYYY-MM kutiladi)' });
  }

  try {
    const result = await pool.query(
      `SELECT EXTRACT(DAY FROM ${KUN})::int AS kun,
              COUNT(*) FILTER (WHERE bk.holati = 1)::int AS holati1,
              COUNT(*) FILTER (WHERE bk.holati = 2)::int AS holati2
       FROM bola_kun bk
       JOIN bola_kuni_all a ON a.id = bk.darssana_id
       WHERE TO_CHAR(${KUN}, 'YYYY-MM') = $1
       GROUP BY EXTRACT(DAY FROM ${KUN})
       ORDER BY kun`,
      [month]
    );

    const byDay = {};
    result.rows.forEach((r) => { byDay[r.kun] = r; });

    const [y, m] = month.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const data = Array.from({ length: daysInMonth }, (_, i) => {
      const row = byDay[i + 1];
      return {
        kun: String(i + 1).padStart(2, '0'),
        holati1: row ? row.holati1 : 0,
        holati2: row ? row.holati2 : 0,
      };
    });

    return res.json(data);
  } catch (err) {
    console.error('GET /bola_kun/stats/daily xatolik:', err.message);
    return res.status(500).json({ error: 'Kunlik davomatni olishda xatolik' });
  }
}

export default requireAuth(handler);
