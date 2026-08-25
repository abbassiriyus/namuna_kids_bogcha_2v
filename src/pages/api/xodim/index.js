import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { parseForm, saveUploadedFile, getField } from '@/lib/uploads';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const result = await pool.query(`
        SELECT x.*, l.name AS lavozim_nomi
        FROM xodim x
        LEFT JOIN lavozim l ON x.lavozim_id = l.id
        ORDER BY x.id DESC
      `);
      return res.status(200).json(result.rows);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { fields, files } = await parseForm(req);
      const name = getField(fields, 'name');
      const phone = getField(fields, 'phone');
      const lavozim_id = getField(fields, 'lavozim_id');
      const address = getField(fields, 'address');
      const oylik = getField(fields, 'oylik');
      const ish_tur = getField(fields, 'ish_tur');
      const start_time = getField(fields, 'start_time');
      const end_time = getField(fields, 'end_time');

      let image = null;
      if (files && files.image) {
        image = await saveUploadedFile(files.image);
      }

      const result = await pool.query(
        `INSERT INTO xodim (name, phone, lavozim_id, address, oylik, ish_tur, start_time, end_time, image)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [name, phone, lavozim_id, address, oylik, ish_tur || 1, start_time || null, end_time || null, image]
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
