import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function handler(req, res) {
  if (req.method === 'GET') {
    const { bola_id } = req.query;
    try {
      let query = 'SELECT * FROM bola_pay_new';
      const params = [];
      if (bola_id) {
        query += ' WHERE bola_id = $1';
        params.push(bola_id);
      }
      query += ' ORDER BY sana DESC';
      const result = await pool.query(query, params);
      return res.json(result.rows);
    } catch (err) {
      console.error('Fetch bola_pay_new error:', err.message);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  if (req.method === 'POST') {
    const { bola_id, miqdor, sana } = req.body;
    try {
      const result = await pool.query(
        `INSERT INTO bola_pay_new (bola_id, miqdor, sana) VALUES ($1, $2, $3) RETURNING *`,
        [bola_id, miqdor, sana]
      );
      return res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Create bola_pay_new error:', err.message);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default requireAuth(handler);
