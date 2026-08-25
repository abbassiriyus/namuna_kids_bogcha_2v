import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const kirim = await pool.query(
        `SELECT COALESCE(SUM(hajm), 0) AS kirim FROM kirim_maishiy WHERE sklad_product_id = $1`,
        [id]
      );
      const chiqim = await pool.query(
        `SELECT COALESCE(SUM(hajm), 0) AS chiqim FROM chiqim_maishiy WHERE sklad_product_id = $1`,
        [id]
      );

      const mavjud = kirim.rows[0].kirim - chiqim.rows[0].chiqim;

      return res.json({ mavjud });
    } catch (err) {
      console.error('Mavjud hajm hisobida xatolik:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', ['GET']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default requireAuth(handler);
