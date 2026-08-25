import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const result = await pool.query('SELECT * FROM taom ORDER BY id');
      return res.json(result.rows);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  if (req.method === 'POST') {
    const { nomi } = req.body;
    try {
      const result = await pool.query(
        'INSERT INTO taom (nomi) VALUES ($1) RETURNING *',
        [nomi]
      );
      return res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default requireAuth(handler);
