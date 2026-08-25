import pool from '@/lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { xodim_id, action } = req.body;

  if (!xodim_id) return res.status(400).json({ message: 'xodim_id kerak' });

  try {
    const openRecord = await pool.query(
      `SELECT * FROM xodim_one_day
       WHERE xodim_id = $1 AND created_at::date = CURRENT_DATE
       ORDER BY created_at DESC LIMIT 1`,
      [xodim_id]
    );
    const record = openRecord.rows[0] || null;
    const isOpen = !!(record && record.start_time && !record.end_time);

    if (action === 'kelish') {
      if (isOpen) return res.status(409).json({ message: 'Xodim allaqachon ishga kelgan' });
      const inserted = await pool.query(
        `INSERT INTO xodim_one_day (xodim_id, start_time) VALUES ($1, CURRENT_TIME) RETURNING *`,
        [xodim_id]
      );
      return res.status(201).json({ action: 'kelish', record: inserted.rows[0] });
    }

    if (action === 'ketish') {
      if (!isOpen) return res.status(409).json({ message: 'Xodimning ochiq kelish yozuvi topilmadi' });
      const updated = await pool.query(
        `UPDATE xodim_one_day SET end_time = CURRENT_TIME, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 RETURNING *`,
        [record.id]
      );
      return res.status(200).json({ action: 'ketish', record: updated.rows[0] });
    }

    if (!record) {
      const inserted = await pool.query(
        `INSERT INTO xodim_one_day (xodim_id, start_time) VALUES ($1, CURRENT_TIME) RETURNING *`,
        [xodim_id]
      );
      return res.status(201).json({ action: 'kelish', record: inserted.rows[0] });
    }

    if (isOpen) {
      const updated = await pool.query(
        `UPDATE xodim_one_day SET end_time = CURRENT_TIME, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 RETURNING *`,
        [record.id]
      );
      return res.status(200).json({ action: 'ketish', record: updated.rows[0] });
    }

    const inserted = await pool.query(
      `INSERT INTO xodim_one_day (xodim_id, start_time) VALUES ($1, CURRENT_TIME) RETURNING *`,
      [xodim_id]
    );
    return res.status(201).json({ action: 'kelish', record: inserted.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
