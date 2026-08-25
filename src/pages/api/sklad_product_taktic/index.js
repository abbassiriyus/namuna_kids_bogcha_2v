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
  if (req.method === 'GET') {
    try {
      const { start, end, product } = req.query;

      let query = `SELECT * FROM sklad_product_taktic WHERE 1=1`;
      const params = [];

      if (start) {
        params.push(start);
        query += ` AND created_at >= $${params.length}`;
      }
      if (end) {
        params.push(end);
        query += ` AND created_at < $${params.length}::timestamptz + INTERVAL '1 day'`;
      }
      if (product) {
        params.push(product);
        query += ` AND sklad_product_id = $${params.length}`;
      }

      query += ` ORDER BY id DESC`;

      const result = await pool.query(query, params);
      return res.status(200).json(result.rows);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    const items = Array.isArray(req.body) ? req.body : [req.body];

    if (items.length === 0) {
      return res.status(400).json({ error: "Bo‘sh ma'lumot yuborildi" });
    }

    for (let i = 0; i < items.length; i++) {
      const errors = validateKirim(items[i]);
      if (errors.length > 0) {
        const prefix = items.length > 1 ? `${i + 1}-qator: ` : '';
        return res.status(400).json({ error: prefix + errors.join('; ') });
      }
    }

    try {
      const params = [];
      const values = items
        .map((it) => {
          params.push(it.hajm, it.sklad_product_id, it.narx, it.payment_method || null, it.description || '');
          const n = params.length;
          return `($${n - 4}, $${n - 3}, $${n - 2}, $${n - 1}, $${n})`;
        })
        .join(', ');

      const result = await pool.query(
        `INSERT INTO sklad_product_taktic (hajm, sklad_product_id, narx, payment_method, description)
         VALUES ${values}
         RETURNING *`,
        params
      );
      return res.status(201).json(Array.isArray(req.body) ? result.rows : result.rows[0]);
    } catch (err) {
      return sendDbError(res, err, 'Kirim qo‘shishda xatolik yuz berdi');
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default requireAuth(handler);
