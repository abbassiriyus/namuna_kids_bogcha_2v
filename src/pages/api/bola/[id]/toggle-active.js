import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function handler(req, res) {
  const { id } = req.query;

  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const result = await pool.query('SELECT is_active FROM bola WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Bola topilmadi' });
    }

    const current = result.rows[0].is_active;
    const updated = !current;

    await pool.query('UPDATE bola SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [updated, id]);

    return res.json({ message: 'Holat muvaffaqiyatli yangilandi', is_active: updated });
  } catch (err) {
    console.error('Toggle is_active xatolik:', err);
    return res.status(500).json({ message: 'Server xatosi' });
  }
}

export default requireAuth(handler);
