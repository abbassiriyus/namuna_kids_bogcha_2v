import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { start, end, product } = req.query;
      let query = 'SELECT * FROM kirim_maishiy WHERE 1=1';
      const values = [];

      if (start) {
        values.push(start);
        query += ` AND created_at >= $${values.length}`;
      }
      if (end) {
        values.push(end);
        query += ` AND created_at < $${values.length}::timestamptz + INTERVAL '1 day'`;
      }
      if (product) {
        values.push(product);
        query += ` AND sklad_product_id = $${values.length}`;
      }

      query += ' ORDER BY id DESC';

      const result = await pool.query(query, values);
      return res.status(200).json(result.rows);
    } catch (err) {
      console.error('Filterda xatolik:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', ['GET']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default requireAuth(handler);
