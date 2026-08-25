import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { sendDbError } from '@/lib/dbError';
import { checkStock, stockErrorMessage, lockProducts, validateChiqim } from '@/lib/ombor';

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const items = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Bo‘sh ma'lumot yuborildi." });
  }

  for (let i = 0; i < items.length; i++) {
    const rowErrors = validateChiqim(items[i]);
    if (rowErrors.length > 0) {
      return res.status(400).json({ error: `${i + 1}-qator: ${rowErrors.join('; ')}` });
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await lockProducts(client, items.map((i) => i.sklad_product_id));

    // Bir mahsulot bir necha qatorda kelsa, checkStock ularni yig'ib tekshiradi.
    const yetishmaydi = await checkStock(client, items);
    if (yetishmaydi.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: stockErrorMessage(yetishmaydi), yetishmaydi });
    }

    const params = [];
    const values = items
      .map((i) => {
        params.push(i.sklad_product_id, i.hajm, i.description || '', i.chiqim_sana);
        const n = params.length;
        return `($${n - 3}, $${n - 2}, $${n - 1}, $${n})`;
      })
      .join(',');

    const result = await client.query(
      `INSERT INTO chiqim_ombor (sklad_product_id, hajm, description, chiqim_sana)
       VALUES ${values}
       RETURNING *`,
      params
    );

    await client.query('COMMIT');
    return res.status(201).json(result.rows);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* tranzaksiya allaqachon yopilgan */ }
    return sendDbError(res, err, "Ma'lumotlarni saqlashda xatolik yuz berdi");
  } finally {
    client.release();
  }
}

export default requireAuth(handler);
