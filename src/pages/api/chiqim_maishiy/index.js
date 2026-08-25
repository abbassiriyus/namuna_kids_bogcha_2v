import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { sendDbError } from '@/lib/dbError';
import { checkStock, stockErrorMessage, lockProducts, validateChiqim } from '@/lib/ombor';

async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { start, end, product } = req.query;
      let baseQuery = 'SELECT * FROM chiqim_maishiy WHERE 1=1';
      const values = [];

      if (start) {
        values.push(start);
        baseQuery += ` AND chiqim_sana >= $${values.length}`;
      }
      if (end) {
        values.push(end);
        baseQuery += ` AND chiqim_sana < $${values.length}::timestamptz + INTERVAL '1 day'`;
      }
      if (product) {
        values.push(product);
        baseQuery += ` AND sklad_product_id = $${values.length}`;
      }

      baseQuery += ' ORDER BY id DESC';

      const result = await pool.query(baseQuery, values);
      return res.status(200).json(result.rows);
    } catch (err) {
      console.error('Filter getda xatolik:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    const { hajm, sklad_product_id, description, chiqim_sana } = req.body;
    const errors = validateChiqim({ hajm, sklad_product_id, chiqim_sana });
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join('; ') });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await lockProducts(client, [sklad_product_id], 'maishiy');

      const yetishmaydi = await checkStock(client, [{ sklad_product_id, hajm }], { warehouse: 'maishiy' });
      if (yetishmaydi.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: stockErrorMessage(yetishmaydi), yetishmaydi });
      }

      const result = await client.query(
        `INSERT INTO chiqim_maishiy (hajm, sklad_product_id, description, chiqim_sana)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [hajm, sklad_product_id, description || '', chiqim_sana]
      );

      await client.query('COMMIT');
      return res.status(201).json(result.rows[0]);
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch { /* tranzaksiya allaqachon yopilgan */ }
      return sendDbError(res, err, 'Yaratishda xatolik yuz berdi');
    } finally {
      client.release();
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default requireAuth(handler);
