import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'PUT') {
    const { bola_id, miqdor, sana, izoh } = req.body;
    try {
      const result = await pool.query(
        `UPDATE bola_pay_control SET bola_id = $1, miqdor = $2, sana = $3, izoh = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *`,
        [bola_id, miqdor, sana, izoh, id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      return res.json(result.rows[0]);
    } catch (err) {
      console.error('Update bola_pay_control error:', err.message);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const result = await pool.query(`DELETE FROM bola_pay_control WHERE id = $1 RETURNING *`, [id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      return res.status(204).end();
    } catch (err) {
      console.error('Delete bola_pay_control error:', err.message);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  res.setHeader('Allow', ['PUT', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default requireAuth(handler);
