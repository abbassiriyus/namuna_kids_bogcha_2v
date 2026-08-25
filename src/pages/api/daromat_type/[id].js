import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'PUT') {
    const { naqt = 0, karta = 0, prichislena = 0, naqt_prichislena = 0 } = req.body;
    try {
      const result = await pool.query(
        `UPDATE daromat_type
         SET naqt = $1, karta = $2, prichislena = $3, naqt_prichislena = $4
         WHERE id = $5
         RETURNING *`,
        [naqt, karta, prichislena, naqt_prichislena, id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Topilmadi' });
      return res.json(result.rows[0]);
    } catch (error) {
      console.error('PUT daromat_type:', error);
      return res.status(500).json({ error: 'Yangilab bo‘lmadi' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const result = await pool.query('DELETE FROM daromat_type WHERE id = $1 RETURNING *', [id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Topilmadi' });
      return res.json({ message: 'O‘chirildi', item: result.rows[0] });
    } catch (error) {
      console.error('DELETE daromat_type:', error);
      return res.status(500).json({ error: 'O‘chirib bo‘lmadi' });
    }
  }

  res.setHeader('Allow', ['PUT', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default requireAuth(handler);
