import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const data = req.body;
  if (!Array.isArray(data) || data.length === 0) {
    return res.status(400).json({ error: 'Data should be a non-empty array' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const params = [];
    const values = data
      .map((item) => {
        params.push(item.sklad_product_id, item.hajm, item.narx, item.payment_method || null, item.description || null);
        const n = params.length;
        return `($${n - 4}, $${n - 3}, $${n - 2}, $${n - 1}, $${n})`;
      })
      .join(',');

    const result = await client.query(
      `INSERT INTO kirim_maishiy (sklad_product_id, hajm, narx, payment_method, description)
       VALUES ${values}
       RETURNING *`,
      params
    );

    await client.query('COMMIT');
    return res.status(201).json(result.rows);
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('Rollback xatolik:', rollbackErr.message);
    }
    console.error('Kirim yozishda xatolik:', err.message);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}

export default requireAuth(handler);
