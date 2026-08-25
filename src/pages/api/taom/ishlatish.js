import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { checkStock, stockErrorMessage, lockProducts } from '@/lib/ombor';
import { sendDbError } from '@/lib/dbError';

// Taomnoma tarixi: qaysi kuni qaysi taom necha bolaga tayyorlangani.
async function getTarix(req, res) {
  const { start, end, taom_id } = req.query;
  const params = [];
  const conditions = [];

  if (start) { params.push(start); conditions.push(`ti.sana >= $${params.length}`); }
  if (end) { params.push(end); conditions.push(`ti.sana <= $${params.length}`); }
  if (taom_id) { params.push(taom_id); conditions.push(`ti.taom_id = $${params.length}`); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const result = await pool.query(
      `SELECT ti.id, ti.taom_id, ti.sana, ti.bolalar_soni, ti.created_at, t.nomi AS taom_nomi
       FROM taom_ishlatish ti
       JOIN taom t ON t.id = ti.taom_id
       ${where}
       ORDER BY ti.sana DESC, ti.id DESC`,
      params
    );
    return res.json(result.rows);
  } catch (err) {
    return sendDbError(res, err, 'Tarixni olishda xatolik yuz berdi');
  }
}

async function handler(req, res) {
  if (req.method === 'GET') return getTarix(req, res);

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { taom_id, sana, bolalar_soni } = req.body;
  const taomId = Number(taom_id);
  const soni = Number(bolalar_soni);

  if (!Number.isInteger(taomId) || taomId <= 0) {
    return res.status(400).json({ error: 'Taom tanlanmagan' });
  }
  if (!sana) {
    return res.status(400).json({ error: 'Sana kiritilmagan' });
  }
  if (!Number.isInteger(soni) || soni <= 0) {
    return res.status(400).json({ error: 'Bolalar soni musbat butun son bo‘lishi kerak' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const taomRes = await client.query('SELECT nomi FROM taom WHERE id = $1', [taomId]);
    if (taomRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Taom topilmadi' });
    }
    const taomNomi = taomRes.rows[0].nomi;

    const { rows: ingredients } = await client.query(
      'SELECT sklad_product_id, miqdor FROM taom_ingredient WHERE taom_id = $1',
      [taomId]
    );

    if (ingredients.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Bu taomga hech qanday mahsulot biriktirilmagan' });
    }

    // Retseptdagi miqdor 1 bolaga — bolalar soniga ko'paytiramiz.
    const items = ingredients.map((ing) => ({
      sklad_product_id: ing.sklad_product_id,
      hajm: Number(ing.miqdor) * soni,
    }));

    await lockProducts(client, items.map((i) => i.sklad_product_id));

    const yetishmaydi = await checkStock(client, items);
    if (yetishmaydi.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: stockErrorMessage(yetishmaydi), yetishmaydi });
    }

    const description = `${taomNomi} — ${soni} bola uchun`;
    const params = [];
    const values = items
      .map((r) => {
        params.push(r.hajm, r.sklad_product_id, description, sana);
        const n = params.length;
        return `($${n - 3}, $${n - 2}, $${n - 1}, $${n})`;
      })
      .join(',');

    const inserted = await client.query(
      `INSERT INTO chiqim_ombor (hajm, sklad_product_id, description, chiqim_sana)
       VALUES ${values}
       RETURNING *`,
      params
    );

    const tarix = await client.query(
      `INSERT INTO taom_ishlatish (taom_id, sana, bolalar_soni)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [taomId, sana, soni]
    );

    await client.query('COMMIT');
    return res.status(201).json({
      message: `${taomNomi} — ${soni} bola uchun ombordan yechildi`,
      tarix: { ...tarix.rows[0], taom_nomi: taomNomi },
      chiqimlar: inserted.rows,
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* tranzaksiya allaqachon yopilgan */ }
    return sendDbError(res, err, 'Chiqim yozishda xatolik yuz berdi');
  } finally {
    client.release();
  }
}

export default requireAuth(handler);
