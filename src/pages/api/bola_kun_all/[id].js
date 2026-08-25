import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const result = await pool.query(`SELECT * FROM bola_kuni_all WHERE id = $1`, [id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      return res.json(result.rows[0]);
    } catch (err) {
      console.error('bola_kuni_all fetch by id error:', err.message);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  if (req.method === 'PUT') {
    const { mavzu, sana } = req.body;
    try {
      const result = await pool.query(
        `UPDATE bola_kuni_all SET mavzu = $1, sana = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *`,
        [mavzu, sana, id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      return res.json(result.rows[0]);
    } catch (err) {
      console.error('bola_kuni_all update error:', err.message);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'PUT']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default requireAuth(handler);
