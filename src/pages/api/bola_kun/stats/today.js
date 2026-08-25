import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

const KUN = `a.sana`;

async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const result = await pool.query(
      `SELECT COUNT(*) FILTER (WHERE bk.holati = 1)::int AS kelgan,
              COUNT(*) FILTER (WHERE bk.holati = 2)::int AS kelmagan
       FROM bola_kun bk
       JOIN bola_kuni_all a ON a.id = bk.darssana_id
       WHERE ${KUN}::date = CURRENT_DATE`
    );
    return res.json(result.rows[0] || { kelgan: 0, kelmagan: 0 });
  } catch (err) {
    console.error('GET /bola_kun/stats/today xatolik:', err.message);
    return res.status(500).json({ error: 'Bugungi davomatni olishda xatolik' });
  }
}

export default requireAuth(handler);
