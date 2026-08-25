import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { sendDbError } from '@/lib/dbError';
import { checkStock, stockErrorMessage, lockProducts, validateChiqim } from '@/lib/ombor';

async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'PUT') {
    const { hajm, sklad_product_id, description, chiqim_sana } = req.body;
    const errors = validateChiqim({ hajm, sklad_product_id, chiqim_sana });
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join('; ') });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await lockProducts(client, [sklad_product_id], 'maishiy');

      // Tahrirlanayotgan yozuvning eski hajmi qoldiqdan chiqarib tashlanadi.
      const yetishmaydi = await checkStock(client, [{ sklad_product_id, hajm }], {
        warehouse: 'maishiy',
        excludeChiqimId: id,
      });
      if (yetishmaydi.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: stockErrorMessage(yetishmaydi), yetishmaydi });
      }

      const result = await client.query(
        `UPDATE chiqim_maishiy SET
           hajm = $1,
           sklad_product_id = $2,
           description = $3,
           chiqim_sana = COALESCE($4, chiqim_sana),
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $5 RETURNING *`,
        [hajm, sklad_product_id, description || '', chiqim_sana, id]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Yozuv topilmadi' });
      }

      await client.query('COMMIT');
      return res.json(result.rows[0]);
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch { /* tranzaksiya allaqachon yopilgan */ }
      return sendDbError(res, err, 'Tahrirlashda xatolik yuz berdi');
    } finally {
      client.release();
    }
  }

  if (req.method === 'DELETE') {
    try {
      await pool.query('DELETE FROM chiqim_maishiy WHERE id = $1', [id]);
      return res.status(204).end();
    } catch (err) {
      return sendDbError(res, err, 'O‘chirishda xatolik yuz berdi');
    }
  }

  res.setHeader('Allow', ['PUT', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default requireAuth(handler);
