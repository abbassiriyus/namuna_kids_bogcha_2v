import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const result = await pool.query('SELECT * FROM taom_ingredient WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Not found' });
      }
      return res.json(result.rows[0]);
    } catch (err) {
      console.error('Error fetching taom_ingredient:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  if (req.method === 'PUT') {
    const productId = Number(req.body.sklad_product_id);
    const miqdor = Number(req.body.miqdor);

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ error: 'Mahsulot tanlanmagan' });
    }
    if (!Number.isFinite(miqdor) || miqdor <= 0) {
      return res.status(400).json({ error: 'Miqdor musbat son bo‘lishi kerak' });
    }

    try {
      const result = await pool.query(
        `UPDATE taom_ingredient
         SET sklad_product_id = $1,
             miqdor = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [productId, miqdor, id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Not found' });
      }
      return res.json(result.rows[0]);
    } catch (err) {
      console.error('Error updating taom_ingredient:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const result = await pool.query('DELETE FROM taom_ingredient WHERE id = $1 RETURNING *', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Not found' });
      }
      return res.json({ message: 'Deleted successfully' });
    } catch (err) {
      console.error('Error deleting taom_ingredient:', err);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default requireAuth(handler);
