import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function handler(req, res) {
  if (req.method === 'GET') {
    const { month } = req.query;
    try {
      const result = month
        ? await pool.query(
            `SELECT * FROM oylik_type WHERE TO_CHAR(created_at, 'YYYY-MM') = $1 ORDER BY id DESC`,
            [month]
          )
        : await pool.query(`SELECT * FROM oylik_type ORDER BY id DESC`);
      return res.status(200).json(result.rows);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    const { narx, xodim_id } = req.body;
    try {
      const result = await pool.query(
        `INSERT INTO oylik_type (narx, xodim_id) VALUES ($1, $2) RETURNING *`,
        [narx, xodim_id]
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
