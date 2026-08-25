import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const result = await pool.query('SELECT * FROM bola_prp WHERE id = $1', [id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json(result.rows[0]);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'PUT') {
    const {
      username, metrka, guruh_id, tugilgan_kun, oylik_toliv, balans, holati,
      ota_fish, ota_phone, ota_pasport, ona_fish, ona_phone, ona_pasport,
      qoshimcha_phone, address, description, is_active
    } = req.body;

    try {
      const result = await pool.query(
        `UPDATE bola_prp SET
          username = $1,
          metrka = $2,
          guruh_id = $3,
          tugilgan_kun = $4,
          oylik_toliv = $5,
          balans = $6,
          holati = $7,
          ota_fish = $8,
          ota_phone = $9,
          ota_pasport = $10,
          ona_fish = $11,
          ona_phone = $12,
          ona_pasport = $13,
          qoshimcha_phone = $14,
          address = $15,
          description = $16,
          is_active = COALESCE($17, is_active),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $18
        RETURNING *`,
        [
          username, metrka, guruh_id, tugilgan_kun, oylik_toliv, balans, holati,
          ota_fish, ota_phone, ota_pasport, ona_fish, ona_phone, ona_pasport,
          qoshimcha_phone, address, description, is_active, id
        ]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json(result.rows[0]);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await pool.query('DELETE FROM bola_prp WHERE id = $1', [id]);
      return res.status(204).end();
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default requireAuth(handler);
