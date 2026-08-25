import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { id } = req.query;
  const { descriptor } = req.body;

  if (!Array.isArray(descriptor) || descriptor.length === 0) {
    return res.status(400).json({ message: 'descriptor massivi kerak' });
  }

  try {
    const result = await pool.query(
      `UPDATE xodim SET face_descriptor = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name`,
      [JSON.stringify(descriptor), id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Xodim topilmadi' });
    return res.status(200).json({ message: 'Yuz saqlandi', xodim: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export default requireAuth(handler);
