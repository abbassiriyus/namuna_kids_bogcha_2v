import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'PUT') {
    const { hajm, sklad_product_id, narx, payment_method, description } = req.body;
    try {
      const result = await pool.query(
        `UPDATE kirim_maishiy SET
           hajm = $1,
           sklad_product_id = $2,
           narx = $3,
           payment_method = $4,
           description = $5,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $6 RETURNING *`,
        [hajm, sklad_product_id, narx, payment_method, description, id]
      );
      return res.json(result.rows[0]);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Tahrirlashda xatolik' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await pool.query('DELETE FROM kirim_maishiy WHERE id = $1', [id]);
      return res.status(204).end();
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'O‘chirishda xatolik' });
    }
  }

  res.setHeader('Allow', ['PUT', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default requireAuth(handler);
