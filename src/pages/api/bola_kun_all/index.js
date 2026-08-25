import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function handler(req, res) {
  if (req.method === 'POST') {
    const { sana, mavzu } = req.body;
    try {
      const result = await pool.query(`
        INSERT INTO bola_kuni_all (sana, mavzu) VALUES ($1, $2) RETURNING *
      `, [sana, mavzu]);
      return res.json(result.rows[0]);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'GET') {
    const { month, year } = req.query;
    try {
      const result = await pool.query(`
        SELECT * FROM bola_kuni_all
        WHERE EXTRACT(MONTH FROM sana) = $1 AND EXTRACT(YEAR FROM sana) = $2
      `, [month, year]);
      return res.json(result.rows);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'DELETE') {
    const { sana } = req.body;
    try {
      const result = await pool.query(`
        DELETE FROM bola_kuni_all WHERE sana = $1 RETURNING *
      `, [sana]);
      return res.json({ message: 'Deleted', date: sana, deleted: result.rows });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default requireAuth(handler);
