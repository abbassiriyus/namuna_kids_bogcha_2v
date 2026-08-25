import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function handler(req, res) {
  if (req.method === 'POST') {
    const { mavzu, sana } = req.body;
    try {
      const result = await pool.query(
        `INSERT INTO darssana (mavzu, sana) VALUES ($1, $2) RETURNING *`,
        [mavzu, sana]
      );
      return res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Darssana create error:', err.message);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  if (req.method === 'GET') {
    const { month } = req.query;

    try {
      if (month) {
        if (!/^\d{4}-\d{2}$/.test(month)) {
          return res.status(400).json({ error: 'Invalid month format. Use YYYY-MM.' });
        }

        const year = month.split('-')[0];
        const monthNum = parseInt(month.split('-')[1], 10);

        const lastDay = new Date(year, monthNum, 0).getDate();
        const startDate = `${month}-01`;
        const endDate = `${month}-${lastDay}`;

        const result = await pool.query(
          `SELECT * FROM darssana WHERE sana BETWEEN $1 AND $2 ORDER BY sana DESC`,
          [startDate, endDate]
        );
        return res.json(result.rows);
      }

      const result = await pool.query(`SELECT * FROM darssana ORDER BY sana DESC`);
      return res.json(result.rows);
    } catch (err) {
      console.error('Darssana fetch error:', err.message);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default requireAuth(handler);
