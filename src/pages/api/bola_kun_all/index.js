import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { monthRangeDate, isMonth } from '@/lib/sqlDate';

async function handler(req, res) {
  if (req.method === 'POST') {
    const { sana, mavzu } = req.body;
    try {
      const result = await pool.query(`
        INSERT INTO bola_kuni_all (sana, mavzu) VALUES ($1, $2) RETURNING *
      `, [sana, mavzu]);
      return res.json(result.rows[0]);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'GET') {
    const { month, year } = req.query;

    // Oldin oy/yil alohida `EXTRACT(...)` bilan solishtirilardi — bunda
    // indeksdan foydalanib bo'lmaydi. Endi bitta "YYYY-MM" oralig'iga
    // aylantiramiz; natija bir xil, lekin indeks ishlaydi.
    const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
    if (!isMonth(yearMonth)) {
      return res.status(400).json({ error: 'month/year noto‘g‘ri (masalan month=8, year=2026)' });
    }

    try {
      const result = await pool.query(
        `SELECT * FROM bola_kuni_all WHERE ${monthRangeDate('sana', 1)}`,
        [yearMonth]
      );
      return res.json(result.rows);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'DELETE') {
    const { sana } = req.body;
    try {
      const result = await pool.query(`
        DELETE FROM bola_kuni_all WHERE sana = $1 RETURNING *
      `, [sana]);
      return res.json({ message: 'Deleted', date: sana, deleted: result.rows });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default requireAuth(handler);
