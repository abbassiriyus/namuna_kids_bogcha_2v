import fs from 'fs';
import path from 'path';
import { getUploadPath, UPLOAD_DIR } from '@/lib/uploads';

const MIME_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.jfif': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { filename } = req.query;

  // Papkadan tashqariga chiqishni (path traversal) oldini olish.
  const safeName = path.basename(filename);
  const filePath = getUploadPath(safeName);

  if (!filePath.startsWith(UPLOAD_DIR) || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Fayl topilmadi' });
  }

  const ext = path.extname(safeName).toLowerCase();
  res.setHeader('Content-Type', MIME_TYPES[ext] || 'application/octet-stream');

  // Brauzer fayl turini o'zi "taxmin qilib" HTML deb ochib yubormasin.
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // SVG ichida JavaScript bo'lishi mumkin. <img> tegida u baribir ishlamaydi,
  // lekin faylni to'g'ridan-to'g'ri manzil orqali ochganda ishlab ketardi —
  // CSP shuni to'sadi (rasm ko'rinishiga ta'sir qilmaydi).
  if (ext === '.svg') {
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
  }

  // Fayl nomi `<vaqt>_<asl nom>` — bir marta yozilgach o'zgarmaydi, shuning
  // uchun uzoq keshlash xavfsiz va rasmlar qayta yuklanmaydi.
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

  const stream = fs.createReadStream(filePath);
  stream.on('error', (err) => {
    console.error('[upload] Faylni o\u2018qishda xato:', err.message);
    if (!res.headersSent) res.status(500).end();
    else res.end();
  });
  stream.pipe(res);
}
