import pool from '@/lib/db';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { id } = req.query;
  const { scope } = req.query;
  try {
    const openRecord = await pool.query(
      `SELECT * FROM xodim_one_day
       WHERE xodim_id = $1 AND created_at::date = CURRENT_DATE
       ORDER BY created_at DESC LIMIT 1`,
      [id]
    );
    const record = openRecord.rows[0];
    if (!record) return res.status(404).json({ message: 'Bugungi yozuv topilmadi' });

    if (scope === 'end') {
      if (!record.end_time) {
        return res.status(409).json({ message: 'Ketish vaqti hali belgilanmagan' });
      }
      const updated = await pool.query(
        `UPDATE xodim_one_day SET end_time = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 RETURNING *`,
        [record.id]
      );
      return res.status(200).json({ message: 'Ketish vaqti bekor qilindi', record: updated.rows[0] });
    }

    const result = await pool.query(
      `DELETE FROM xodim_one_day WHERE id = $1 RETURNING *`,
      [record.id]
    );
    return res.status(200).json({ message: 'Bekor qilindi', record: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
