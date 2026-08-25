import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { sendDbError } from '@/lib/dbError';

function validateQoshimcha({ price }) {
  const narx = Number(price);
  if (price === undefined || price === null || price === '' || !Number.isFinite(narx) || narx <= 0) {
    return 'Narx kiritilmagan yoki 0 dan katta emas';
  }
  return null;
}

async function handler(req, res) {
  if (req.method === 'POST') {
    const { price, payment_method, description } = req.body;
    const error = validateQoshimcha({ price });
    if (error) return res.status(400).json({ error });

    try {
      const result = await pool.query(
        `INSERT INTO chiqim_qoshimcha (price, payment_method, description)
         VALUES ($1, $2, $3) RETURNING *`,
        [price, payment_method || null, description || '']
      );
      return res.status(201).json(result.rows[0]);
    } catch (err) {
      return sendDbError(res, err, 'Qo‘shishda xatolik yuz berdi');
    }
  }

  if (req.method === 'GET') {
    try {
      const { start, end } = req.query;
      let query = 'SELECT * FROM chiqim_qoshimcha WHERE 1=1';
      const values = [];

      if (start) {
        values.push(start);
        query += ` AND created_at >= $${values.length}`;
      }
      if (end) {
        values.push(end);
        query += ` AND created_at < $${values.length}::timestamptz + INTERVAL '1 day'`;
      }

      query += ' ORDER BY created_at DESC';

      const result = await pool.query(query, values);
      return res.json(result.rows);
    } catch (err) {
      console.error('Olishda xatolik:', err.message);
      return res.status(500).json({ error: 'Olishda xatolik' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default requireAuth(handler);
