import jwt from 'jsonwebtoken';
import pool from '@/lib/db';
import { SECRET_KEY } from '@/lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { username, password } = req.body;

  try {
    const result = await pool.query(`SELECT * FROM admin WHERE username = $1`, [username]);
    const admin = result.rows[0];

    // `code` — klient uni o'z tiliga tarjima qiladi (message faqat zaxira sifatida).
    if (!admin) {
      return res.status(404).json({ code: 'userNotFound', message: 'Bunday foydalanuvchi topilmadi' });
    }

    if (!admin.is_active) {
      return res.status(403).json({ code: 'inactive', message: 'Admin faollashtirilmagan' });
    }

    if (admin.password !== password) {
      return res.status(401).json({ code: 'wrongPassword', message: "Parol noto'g'ri" });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username, type: admin.type },
      SECRET_KEY,
      { expiresIn: '7d' }
    );

    // Parol javobda qaytmasligi kerak — u localStorage'ga tushib qolardi.
    const { password: _, ...adminData } = admin;
    return res.status(200).json({ token, admin: adminData });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
