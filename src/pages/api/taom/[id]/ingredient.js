import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { sendDbError } from '@/lib/dbError';

async function handler(req, res) {
  const taomId = Number(req.query.id);

  if (!Number.isInteger(taomId) || taomId <= 0) {
    return res.status(400).json({ error: 'Taom tanlanmagan' });
  }

  if (req.method === 'GET') {
    try {
      const result = await pool.query(
        `SELECT ti.id,
                ti.sklad_product_id,
                ti.miqdor,
                s.nomi,
                s.hajm_birlik,
                s.hajm + COALESCE(k.kirim, 0) - COALESCE(c.chiqim, 0) AS mavjud
         FROM taom_ingredient ti
         JOIN sklad_product s ON ti.sklad_product_id = s.id
         LEFT JOIN (
           SELECT sklad_product_id, SUM(hajm) AS kirim
           FROM sklad_product_taktic GROUP BY sklad_product_id
         ) k ON k.sklad_product_id = s.id
         LEFT JOIN (
           SELECT sklad_product_id, SUM(hajm) AS chiqim
           FROM chiqim_ombor GROUP BY sklad_product_id
         ) c ON c.sklad_product_id = s.id
         WHERE ti.taom_id = $1
         ORDER BY ti.id DESC`,
        [taomId]
      );

      return res.json(result.rows.map((r) => ({ ...r, mavjud: Number(r.mavjud) })));
    } catch (err) {
      return sendDbError(res, err, 'Mahsulotlarni olishda xatolik yuz berdi');
    }
  }

  if (req.method === 'POST') {
    const productId = Number(req.body.sklad_product_id);
    const miqdor = Number(req.body.miqdor);

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ error: 'Mahsulot tanlanmagan' });
    }
    if (!Number.isFinite(miqdor) || miqdor <= 0) {
      return res.status(400).json({ error: 'Miqdor musbat son bo‘lishi kerak' });
    }

    try {
      // Bitta taomda bir mahsulot ikki marta turmasligi uchun — mavjudini yangilaymiz.
      const existing = await pool.query(
        'SELECT id FROM taom_ingredient WHERE taom_id = $1 AND sklad_product_id = $2',
        [taomId, productId]
      );

      if (existing.rows.length > 0) {
        const updated = await pool.query(
          `UPDATE taom_ingredient
           SET miqdor = $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2
           RETURNING *`,
          [miqdor, existing.rows[0].id]
        );
        return res.json(updated.rows[0]);
      }

      const result = await pool.query(
        `INSERT INTO taom_ingredient (taom_id, sklad_product_id, miqdor)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [taomId, productId, miqdor]
      );
      return res.status(201).json(result.rows[0]);
    } catch (err) {
      return sendDbError(res, err, 'Mahsulotni biriktirishda xatolik yuz berdi');
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default requireAuth(handler);
