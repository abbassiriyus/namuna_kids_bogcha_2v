import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function handler(req, res) {
  const { id } = req.query;

  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { holati } = req.body;
  try {
    const result = await pool.query(
      `UPDATE bola_prp SET holati = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [holati, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export default requireAuth(handler);
