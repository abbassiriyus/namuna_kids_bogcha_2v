import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { monthRangeDate } from '@/lib/sqlDate';

async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { year, month } = req.query;
      let query = 'SELECT * FROM daromat_type';
      const values = [];

      if (year && month) {
        query += ` WHERE ${monthRangeDate('sana', 1)}`;
        const yearMonth = `${year}-${month.padStart(2, '0')}`;
        values.push(yearMonth);
      }

      query += ' ORDER BY sana DESC NULLS LAST';

      const { rows } = await pool.query(query, values);
      return res.status(200).json(rows);
    } catch (error) {
      console.error('GET /daromat_type:', error.message);
      return res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
    }
  }

  if (req.method === 'POST') {
    const { bola_id, sana, naqt = 0, karta = 0, prichislena = 0, naqt_prichislena = 0 } = req.body;
    try {
      const result = await pool.query(
        `INSERT INTO daromat_type (bola_id, sana, naqt, karta, prichislena, naqt_prichislena)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [bola_id, sana, naqt, karta, prichislena, naqt_prichislena]
      );
      return res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('POST daromat_type:', error);
      return res.status(500).json({ error: 'Yozib bo‘lmadi' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default requireAuth(handler);
