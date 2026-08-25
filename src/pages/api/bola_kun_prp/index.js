import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const result = await pool.query(`SELECT * FROM bola_kun_prp ORDER BY created_at DESC`);
      return res.json(result.rows);
    } catch (err) {
      console.error('Fetch bola_kun_prp error:', err.message);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  if (req.method === 'POST') {
    const { holati, bola_id, darssana_id } = req.body;
    try {
      const result = await pool.query(
        `INSERT INTO bola_kun_prp (holati, bola_id, darssana_id) VALUES ($1, $2, $3) RETURNING *`,
        [holati, bola_id, darssana_id]
      );
      return res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Create bola_kun_prp error:', err.message);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default requireAuth(handler);
