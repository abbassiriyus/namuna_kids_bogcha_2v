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

  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
}
