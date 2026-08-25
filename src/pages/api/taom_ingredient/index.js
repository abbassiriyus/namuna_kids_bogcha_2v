import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function handler(req, res) {
  if (req.method === 'POST') {
    const { sklad_product_id, miqdor, taom_id } = req.body;
    try {
      const result = await pool.query(
        `INSERT INTO taom_ingredient (sklad_product_id, miqdor,taom_id)
         VALUES ($1, $2,$3)
         RETURNING *`,
        [sklad_product_id, miqdor, taom_id]
      );
      return res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Error creating taom_ingredient:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  if (req.method === 'GET') {
    try {
      const result = await pool.query('SELECT * FROM taom_ingredient ORDER BY id');
      return res.json(result.rows);
    } catch (err) {
      console.error('Error fetching taom_ingredient list:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default requireAuth(handler);
