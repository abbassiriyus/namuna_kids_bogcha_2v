import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const result = await pool.query(`SELECT * FROM darssana WHERE id = $1`, [id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      return res.json(result.rows[0]);
    } catch (err) {
      console.error('Darssana fetch by id error:', err.message);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  if (req.method === 'PUT') {
    const { mavzu, sana } = req.body;
    try {
      const result = await pool.query(
        `UPDATE darssana SET mavzu = $1, sana = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *`,
        [mavzu, sana, id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      return res.json(result.rows[0]);
    } catch (err) {
      console.error('Darssana update error:', err.message);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  if (req.method === 'DELETE') {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`DELETE FROM bola_kun WHERE darssana_id = $1`, [id]);
      const result = await client.query(`DELETE FROM darssana WHERE id = $1 RETURNING *`, [id]);

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Not found' });
      }

      await client.query('COMMIT');
      return res.json({ message: 'Dars va unga bog‘langan davomatlar o‘chirildi' });
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch (rollbackErr) { console.error('Rollback xatolik:', rollbackErr.message); }
      console.error('Darssana delete error:', err.message);
      return res.status(500).json({ error: 'Server error' });
    } finally {
      client.release();
    }
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default requireAuth(handler);
