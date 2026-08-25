import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const result = await pool.query(`SELECT * FROM bola_kun_prp WHERE id = $1`, [id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      return res.json(result.rows[0]);
    } catch (err) {
      console.error('Fetch bola_kun_prp by id error:', err.message);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  if (req.method === 'PUT') {
    const { holati, bola_id, darssana_id } = req.body;
    try {
      const result = await pool.query(
        `UPDATE bola_kun_prp SET holati = $1, bola_id = $2, darssana_id = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *`,
        [holati, bola_id, darssana_id, id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      return res.json(result.rows[0]);
    } catch (err) {
      console.error('Update bola_kun_prp error:', err.message);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const result = await pool.query(`DELETE FROM bola_kun_prp WHERE id = $1 RETURNING *`, [id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      return res.json({ message: 'Deleted successfully' });
    } catch (err) {
      console.error('Delete bola_kun_prp error:', err.message);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default requireAuth(handler);
