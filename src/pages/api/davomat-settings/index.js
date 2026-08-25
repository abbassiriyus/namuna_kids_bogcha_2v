import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const result = await pool.query(`SELECT mode FROM davomat_settings ORDER BY id LIMIT 1`);
      return res.status(200).json({ mode: result.rows[0]?.mode || 'button' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'PUT') {
    const user = verifyToken(req);
    if (!user) return res.status(401).json({ message: 'Token kerak' });
    if (user.type !== 1) {
      return res.status(403).json({ message: 'Faqat super admin davomat rejimini o‘zgartira oladi' });
    }

    const { mode } = req.body;
    if (mode !== 'button' && mode !== 'face') {
      return res.status(400).json({ message: 'mode "button" yoki "face" bo‘lishi kerak' });
    }

    try {
      const result = await pool.query(
        `UPDATE davomat_settings SET mode = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = (SELECT id FROM davomat_settings ORDER BY id LIMIT 1)
         RETURNING mode`,
        [mode]
      );
      if (result.rows.length === 0) {
        const inserted = await pool.query(
          `INSERT INTO davomat_settings (mode) VALUES ($1) RETURNING mode`,
          [mode]
        );
        return res.status(200).json({ mode: inserted.rows[0].mode });
      }
      return res.status(200).json({ mode: result.rows[0].mode });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', ['GET', 'PUT']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
