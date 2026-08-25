import pool from '@/lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const result = await pool.query(
      `SELECT x.id,
              x.name,
              x.ish_tur,
              x.start_time  AS plan_start,
              x.end_time    AS plan_end,
              d.start_time  AS kelgan,
              d.end_time    AS ketgan,
              (x.face_descriptor IS NOT NULL) AS face_bor
       FROM xodim x
       LEFT JOIN LATERAL (
         SELECT start_time, end_time
         FROM xodim_one_day
         WHERE xodim_id = x.id AND created_at::date = CURRENT_DATE
         ORDER BY created_at DESC
         LIMIT 1
       ) d ON TRUE
       ORDER BY x.name`
    );
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('today-roster xatolik:', err.message);
    return res.status(500).json({ error: "Xodimlar ro'yxatini olishda xatolik" });
  }
}
