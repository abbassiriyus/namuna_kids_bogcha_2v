import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { sendDbError } from '@/lib/dbError';

function validateKirim({ hajm, sklad_product_id, narx }) {
  const errors = [];
  const productId = Number(sklad_product_id);
  const hajmNum = Number(hajm);
  const narxNum = Number(narx);

  if (!sklad_product_id || !Number.isInteger(productId) || productId <= 0) {
    errors.push('Mahsulot tanlanmagan yoki noto‘g‘ri');
  }
  if (hajm === undefined || hajm === null || hajm === '' || !Number.isFinite(hajmNum) || hajmNum <= 0) {
    errors.push('Hajm noto‘g‘ri yoki kiritilmagan');
  }
  if (narx === undefined || narx === null || narx === '' || !Number.isFinite(narxNum) || narxNum < 0) {
    errors.push('Narx noto‘g‘ri yoki kiritilmagan');
  }
  return errors;
}

async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'PUT') {
    const body = Array.isArray(req.body) ? req.body[0] : req.body;
    const { hajm, sklad_product_id, narx, payment_method, description } = body || {};

    const errors = validateKirim({ hajm, sklad_product_id, narx });
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join('; ') });
    }

    try {
      const result = await pool.query(
        `UPDATE sklad_product_taktic
         SET hajm = $1,
             sklad_product_id = $2,
             narx=$3,
             payment_method=$4,
             description=$5,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $6
         RETURNING *`,
        [hajm, sklad_product_id, narx, payment_method || null, description || '', id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Yozuv topilmadi' });
      }
      return res.status(200).json(result.rows[0]);
    } catch (err) {
      return sendDbError(res, err, 'Kirimni yangilashda xatolik yuz berdi');
    }
  }

  if (req.method === 'DELETE') {
    try {
      await pool.query(`DELETE FROM sklad_product_taktic WHERE id = $1`, [id]);
      return res.status(204).end();
    } catch (err) {
      return sendDbError(res, err, 'Kirimni o‘chirishda xatolik yuz berdi');
    }
  }

  res.setHeader('Allow', ['PUT', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default requireAuth(handler);
