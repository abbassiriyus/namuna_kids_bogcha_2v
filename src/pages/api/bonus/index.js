import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function handler(req, res) {
  if (req.method === 'GET') {
    const { month } = req.query;
    try {
      const result = month
        ? await pool.query(
            `SELECT b.*, x.name AS xodim_nomi
             FROM bonus b
             LEFT JOIN xodim x ON b.xodim_id = x.id
             WHERE TO_CHAR(b.created_at, 'YYYY-MM') = $1
             ORDER BY b.id DESC`,
            [month]
          )
        : await pool.query(
            `SELECT b.*, x.name AS xodim_nomi
             FROM bonus b
             LEFT JOIN xodim x ON b.xodim_id = x.id
             ORDER BY b.id DESC`
          );
      return res.status(200).json(result.rows);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    const { xodim_id, narx } = req.body;
    try {
      const result = await pool.query(
        `INSERT INTO bonus (xodim_id, narx) VALUES ($1, $2) RETURNING *`,
        [xodim_id, narx]
      );
      return res.status(201).json(result.rows[0]);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default requireAuth(handler);
