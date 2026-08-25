import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function handler(req, res) {
  if (req.method === 'GET') {
    const { is_active } = req.query;
    try {
      let query = 'SELECT * FROM bola';
      let params = [];

      if (is_active !== undefined) {
        query += ' WHERE is_active = $1';
        params.push(is_active === 'true' ? true : false);
      }

      query += ' ORDER BY id DESC';

      const result = await pool.query(query, params);
      return res.status(200).json(result.rows);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    const {
      username, metrka, guruh_id, tugilgan_kun, oylik_toliv, balans, holati,
      ota_fish, ota_phone, ota_pasport, ona_fish, ona_phone, ona_pasport,
      qoshimcha_phone, address, description
    } = req.body;

    try {
      const result = await pool.query(
        `INSERT INTO bola (
          username, metrka, guruh_id, tugilgan_kun, oylik_toliv, balans, holati,
          ota_fish, ota_phone, ota_pasport, ona_fish, ona_phone, ona_pasport,
          qoshimcha_phone, address, description
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13,
          $14, $15, $16
        ) RETURNING *`,
        [
          username, metrka, guruh_id, tugilgan_kun, oylik_toliv, balans, holati,
          ota_fish, ota_phone, ota_pasport, ona_fish, ona_phone, ona_pasport,
          qoshimcha_phone, address, description
        ]
      );
      return res.status(201).json(result.rows[0]);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default requireAuth(handler);
