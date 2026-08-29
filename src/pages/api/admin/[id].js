import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { sendDbError } from '@/lib/dbError';
import { hashPassword } from '@/lib/password';

// Parol hash'i hech qaysi javobda qaytmasligi kerak.
const PUBLIC_COLUMNS = `id, username, phone_number, type, description, is_active, created_at, updated_at`;

async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const result = await pool.query(`SELECT ${PUBLIC_COLUMNS} FROM admin WHERE id = $1`, [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Admin topilmadi' });
      }
      return res.status(200).json(result.rows[0]);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'PUT') {
    const { username, phone_number, type, description, password, is_active } = req.body;
    try {
      const params = [username, phone_number, type, description, is_active];
      let setPassword = '';

      // Parol bo'sh kelsa — eskisi saqlanib qoladi (tahrirlash formasi parolni
      // bo'sh yuboradi). To'ldirilgan bo'lsa — hashlab yozamiz.
      if (password) {
        params.push(await hashPassword(password));
        setPassword = `, password = $${params.length}`;
      }

      params.push(id);

      const result = await pool.query(
        `UPDATE admin SET
           username = $1,
           phone_number = $2,
           type = $3,
           description = $4,
           is_active = $5${setPassword},
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $${params.length}
         RETURNING ${PUBLIC_COLUMNS}`,
        params
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Admin topilmadi' });
      }
      return res.status(200).json(result.rows[0]);
    } catch (err) {
      return sendDbError(res, err, 'Adminni saqlashda xatolik yuz berdi');
    }
  }

  if (req.method === 'DELETE') {
    try {
      await pool.query(`DELETE FROM admin WHERE id = $1`, [id]);
      return res.status(204).end();
    } catch (err) {
      return sendDbError(res, err, 'Adminni o\'chirishda xatolik yuz berdi');
    }
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default requireAuth(handler);
