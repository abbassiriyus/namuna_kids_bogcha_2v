import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { sendDbError } from '@/lib/dbError';

async function handler(req, res) {
  const { xodim_id } = req.query;

  if (req.method === 'GET') {
    // Frontend shu yerdan "bugungi yozuv bormi" deb so'raydi (sendTime →
    // getAttendance). Bu handler yo'q edi — GET har doim 405 qaytarardi,
    // shuning uchun "mavjud yozuv" doim topilmagandek ko'rinib, "Ishdan
    // ketdim" tugmasi hech qachon PUT yubormas edi.
    const { workday } = req.query;
    try {
      const result = workday
        ? await pool.query(
            `SELECT * FROM xodim_one_day
             WHERE xodim_id = $1 AND xodim_workdays_id = $2
             ORDER BY created_at DESC LIMIT 1`,
            [xodim_id, workday]
          )
        : await pool.query(
            `SELECT * FROM xodim_one_day
             WHERE xodim_id = $1 AND created_at::date = CURRENT_DATE
             ORDER BY created_at DESC LIMIT 1`,
            [xodim_id]
          );
      return res.status(200).json(result.rows);
    } catch (err) {
      return sendDbError(res, err, "Davomat ma'lumotlarini olishda xatolik yuz berdi");
    }
  }

  if (req.method === 'PUT') {
    const { end_time } = req.body;
    try {
      const result = await pool.query(
        `UPDATE xodim_one_day SET end_time = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = (
           SELECT id FROM xodim_one_day
           WHERE xodim_id = $2 AND created_at::date = CURRENT_DATE
           ORDER BY created_at DESC LIMIT 1
         )
         RETURNING *`,
        [end_time, xodim_id]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: 'Bugungi yozuv topilmadi' });
      return res.status(200).json(result.rows[0]);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', ['GET', 'PUT']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default requireAuth(handler);
