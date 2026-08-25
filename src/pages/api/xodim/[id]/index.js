import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { parseForm, saveUploadedFile, getField } from '@/lib/uploads';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'PUT') {
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

      let imageClause = '';
      const params = [name, phone, lavozim_id, address, oylik, ish_tur || 1, start_time || null, end_time || null];

      if (files && files.image) {
        const image = await saveUploadedFile(files.image);
        params.push(image);
        imageClause = `, image = $${params.length}`;
      }
      params.push(id);

      const result = await pool.query(
        `UPDATE xodim
         SET name = $1, phone = $2, lavozim_id = $3, address = $4, oylik = $5,
             ish_tur = $6, start_time = $7, end_time = $8, updated_at = CURRENT_TIMESTAMP${imageClause}
         WHERE id = $${params.length}
         RETURNING *`,
        params
      );
      return res.status(200).json(result.rows[0]);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await pool.query('DELETE FROM xodim WHERE id = $1', [id]);
      return res.status(204).end();
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', ['PUT', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default requireAuth(handler);
