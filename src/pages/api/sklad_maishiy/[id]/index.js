import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'PUT') {
    const { nomi, hajm, hajm_birlik } = req.body;
    try {
      const result = await pool.query(
        `UPDATE sklad_maishiy SET
           nomi = $1,
           hajm = $2,
           hajm_birlik = $3,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $4 RETURNING *`,
        [nomi, hajm, hajm_birlik, id]
      );
      return res.json(result.rows[0]);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Tahrirlashda xatolik' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await pool.query('DELETE FROM sklad_maishiy WHERE id = $1', [id]);
      return res.status(204).end();
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'O‘chirishda xatolik' });
    }
  }

  res.setHeader('Allow', ['PUT', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default requireAuth(handler);
