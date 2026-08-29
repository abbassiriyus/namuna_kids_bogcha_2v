import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { monthRangeDate } from '@/lib/sqlDate';

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
      `SELECT g.name AS guruh,
              COUNT(bk.id) FILTER (WHERE bk.holati = 1)::int AS holati1,
              COUNT(bk.id) FILTER (WHERE bk.holati = 2)::int AS holati2
       FROM guruh g
       LEFT JOIN bola b ON b.guruh_id = g.id
       LEFT JOIN bola_kun bk ON bk.bola_id = b.id
       LEFT JOIN bola_kuni_all a
              ON a.id = bk.darssana_id AND ${monthRangeDate(KUN, 1)}
       WHERE bk.id IS NULL OR a.id IS NOT NULL
       GROUP BY g.id, g.name
       ORDER BY g.name`,
      [month]
    );

    const data = result.rows.map((r) => {
      const jami = r.holati1 + r.holati2;
      return {
        guruh: r.guruh,
        holati1: r.holati1,
        holati2: r.holati2,
        kpi: jami > 0 ? Number(((r.holati1 / jami) * 10).toFixed(2)) : 0,
      };
    });

    return res.json(data);
  } catch (err) {
    console.error('GET /bola_kun/stats/groups xatolik:', err.message);
    return res.status(500).json({ error: 'Guruhlar statistikasini olishda xatolik' });
  }
}

export default requireAuth(handler);
