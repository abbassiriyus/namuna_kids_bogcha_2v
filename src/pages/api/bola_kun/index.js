import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function handler(req, res) {
  if (req.method === 'POST') {
    const { holati, bola_id, darssana_id } = req.body;

    try {
      const check = await pool.query(
        `SELECT sana, (sana = CURRENT_DATE) AS bugunmi FROM bola_kuni_all WHERE id = $1`,
        [darssana_id]
      );
      if (check.rows.length === 0) {
        return res.status(404).json({ error: 'Dars topilmadi' });
      }

      if (Number(req.user?.type) !== 1 && !check.rows[0].bugunmi) {
        return res.status(403).json({ error: 'Faqat bugungi dars uchun davomat kiritish mumkin' });
      }

      const result = await pool.query(
        `INSERT INTO bola_kun (holati, bola_id, darssana_id) VALUES ($1, $2, $3) RETURNING *`,
        [holati, bola_id, darssana_id]
      );

      return res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Create bola_kun error:', err.message);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  if (req.method === 'GET') {
    const { month } = req.query;
    try {
      if (month) {
        const [year, monthNum] = month.split('-');
        const startDate = `${month}-01`;
        const endDateObj = new Date(year, parseInt(monthNum), 0);
        const endDate = endDateObj.toISOString().slice(0, 10);

        const result = await pool.query(
          `SELECT * FROM bola_kun WHERE created_at BETWEEN $1 AND $2 ORDER BY created_at DESC`,
          [startDate, endDate]
        );
        return res.json(result.rows);
      }

      const result = await pool.query(`SELECT * FROM bola_kun ORDER BY created_at DESC`);
      return res.json(result.rows);
    } catch (err) {
      console.error('Fetch bola_kun error:', err.message);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default requireAuth(handler);
