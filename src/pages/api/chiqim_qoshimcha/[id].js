import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { sendDbError } from '@/lib/dbError';

function validateQoshimcha({ price }) {
  const narx = Number(price);
  if (price === undefined || price === null || price === '' || !Number.isFinite(narx) || narx <= 0) {
    return 'Narx kiritilmagan yoki 0 dan katta emas';
  }
  return null;
}

async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'PUT') {
    const { price, payment_method, description } = req.body;
    const error = validateQoshimcha({ price });
    if (error) return res.status(400).json({ error });

    try {
      const result = await pool.query(
        `UPDATE chiqim_qoshimcha
         SET price = $1, payment_method = $2, description = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4 RETURNING *`,
        [price, payment_method || null, description || '', id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Yozuv topilmadi' });
      return res.json(result.rows[0]);
    } catch (err) {
      return sendDbError(res, err, 'Yangilashda xatolik yuz berdi');
    }
  }

  if (req.method === 'DELETE') {
    try {
      await pool.query(`DELETE FROM chiqim_qoshimcha WHERE id = $1`, [id]);
      return res.status(204).end();
    } catch (err) {
      console.error('O‘chirishda xatolik:', err.message);
      return res.status(500).json({ error: 'O‘chirishda xatolik' });
    }
  }

  res.setHeader('Allow', ['PUT', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default requireAuth(handler);
