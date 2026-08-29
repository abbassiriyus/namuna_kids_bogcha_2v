import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { monthRangeDate } from '@/lib/sqlDate';

async function handler(req, res) {
  const { bola_id, yearMonth } = req.query;

  if (req.method === 'GET') {
    try {
      const result = await pool.query(
        `SELECT * FROM daromat_type
         WHERE bola_id = $1 AND ${monthRangeDate('sana', 2)}`,
        [bola_id, yearMonth]
      );
      return res.json(result.rows);
    } catch (error) {
      console.error('GET /bola/:id:', error);
      return res.status(500).json({ error: 'Xatolik' });
    }
  }

  res.setHeader('Allow', ['GET']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default requireAuth(handler);
