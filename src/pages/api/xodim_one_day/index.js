import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const result = await pool.query(`SELECT * FROM xodim_one_day ORDER BY created_at DESC`);
      return res.status(200).json(result.rows);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    const { xodim_id, xodim_workdays_id, start_time } = req.body;
    try {
      const result = await pool.query(
        `INSERT INTO xodim_one_day (xodim_id, xodim_workdays_id, start_time) VALUES ($1, $2, $3) RETURNING *`,
        [xodim_id, xodim_workdays_id || null, start_time]
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
