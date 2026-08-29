import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { yearRangeDate } from '@/lib/sqlDate';

const KUN = `a.sana`;

async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const year = req.query.year || String(new Date().getFullYear());
  if (!/^\d{4}$/.test(String(year))) {
    return res.status(400).json({ error: 'Yil noto‘g‘ri (YYYY kutiladi)' });
  }

  try {
    const result = await pool.query(
      `SELECT EXTRACT(MONTH FROM ${KUN})::int AS oy_raqami,
              COUNT(*) FILTER (WHERE bk.holati = 1)::int AS holati1,
              COUNT(*) FILTER (WHERE bk.holati = 2)::int AS holati2
       FROM bola_kun bk
       JOIN bola_kuni_all a ON a.id = bk.darssana_id
       WHERE ${yearRangeDate(KUN, 1)}
       GROUP BY EXTRACT(MONTH FROM ${KUN})
       ORDER BY oy_raqami`,
      [String(year)]
    );

    const months = [
      'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
      'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr',
    ];
    const byMonth = {};
    result.rows.forEach((r) => { byMonth[r.oy_raqami] = r; });

    const data = months.map((oy, idx) => {
      const row = byMonth[idx + 1];
      return {
        oy,
        holati1: row ? row.holati1 : 0,
        holati2: row ? row.holati2 : 0,
      };
    });

    return res.json(data);
  } catch (err) {
    console.error('GET /bola_kun/stats xatolik:', err.message);
    return res.status(500).json({ error: 'Davomat statistikasini olishda xatolik' });
  }
}

export default requireAuth(handler);
