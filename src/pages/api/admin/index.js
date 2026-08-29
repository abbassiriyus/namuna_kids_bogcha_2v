import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { sendDbError } from '@/lib/dbError';
import { hashPassword } from '@/lib/password';

async function handler(req, res) {
  if (req.method === 'POST') {
    const { username, phone_number, type, description, password, is_active } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'Parol kiritilishi shart' });
    }

    try {
      // Parol hech qachon ochiq matnda saqlanmaydi.
      const hashed = await hashPassword(password);
      const result = await pool.query(
        `INSERT INTO admin (username, phone_number, type, description, password, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, username, phone_number, type, description, is_active, created_at, updated_at`,
        [username, phone_number, type, description, hashed, is_active]
      );
      return res.status(201).json(result.rows[0]);
    } catch (err) {
      return sendDbError(res, err, 'Admin yaratishda xatolik yuz berdi');
    }
  }

  if (req.method === 'GET') {
    const { type } = req.query;
    try {
      // Parol hash'i ham tashqariga chiqmasin — ro'yxatda kerak emas.
      const columns = `id, username, phone_number, type, description, is_active, created_at, updated_at`;
      const result = type
        ? await pool.query(`SELECT ${columns} FROM admin WHERE type = $1 ORDER BY id DESC`, [type])
        : await pool.query(`SELECT ${columns} FROM admin ORDER BY id DESC`);
      return res.status(200).json(result.rows);
    } catch (err) {
      return sendDbError(res, err, 'Adminlar ro\'yxatini olishda xatolik yuz berdi');
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

export default requireAuth(handler);
