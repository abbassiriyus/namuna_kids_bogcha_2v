import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { sendDbError } from '@/lib/dbError';
import { checkStock, stockErrorMessage, lockProducts, validateChiqim } from '@/lib/ombor';

async function handler(req, res) {
  if (req.method === 'POST') {
    const { hajm, sklad_product_id, description, chiqim_sana } = req.body;
    const errors = validateChiqim({ hajm, sklad_product_id, chiqim_sana });
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join('; ') });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await lockProducts(client, [sklad_product_id]);

      const yetishmaydi = await checkStock(client, [{ sklad_product_id, hajm }]);
      if (yetishmaydi.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: stockErrorMessage(yetishmaydi), yetishmaydi });
      }

      const result = await client.query(
        `INSERT INTO chiqim_ombor (hajm, sklad_product_id, description, chiqim_sana)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [hajm, sklad_product_id, description || '', chiqim_sana]
      );

      await client.query('COMMIT');
      return res.status(201).json(result.rows[0]);
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch { /* tranzaksiya allaqachon yopilgan */ }
      return sendDbError(res, err, 'Qo‘shishda xatolik yuz berdi');
    } finally {
      client.release();
    }
  }

  if (req.method === 'GET') {
    const { start, end, product } = req.query;
    let query = 'SELECT * FROM chiqim_ombor';
    const conditions = [];
    const params = [];

    if (start) { conditions.push(`chiqim_sana >= $${params.length + 1}`); params.push(start); }
    if (end) { conditions.push(`chiqim_sana < $${params.length + 1}::timestamptz + INTERVAL '1 day'`); params.push(end); }
    if (product) { conditions.push(`sklad_product_id = $${params.length + 1}`); params.push(product); }

    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY chiqim_sana DESC';

    try {
      const result = await pool.query(query, params);
      return res.json(result.rows);
    } catch (err) {
      return sendDbError(res, err, 'Ma’lumotlarni olishda xatolik yuz berdi');
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default requireAuth(handler);
