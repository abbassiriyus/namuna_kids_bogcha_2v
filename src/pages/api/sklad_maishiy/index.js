import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const result = await pool.query('SELECT * FROM sklad_maishiy ORDER BY id DESC');
      return res.json(result.rows);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Maʼlumotlarni olishda xatolik' });
    }
  }

  if (req.method === 'POST') {
    const { nomi, hajm, hajm_birlik } = req.body;
    try {
      const result = await pool.query(
        `INSERT INTO sklad_maishiy (nomi, hajm, hajm_birlik)
         VALUES ($1, $2, $3) RETURNING *`,
        [nomi, hajm, hajm_birlik]
      );
      return res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Yaratishda xatolik' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default requireAuth(handler);
