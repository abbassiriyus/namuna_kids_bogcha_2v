const fs = require('fs');
const path = require('path');
const formidable = require('formidable');

// Loyiha ildizidagi `uploads/` papkasi — build'dan tashqarida, deploy'lar
// orasida saqlanib qoladi (backend/uploads bilan bir xil vazifani bajaradi).
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// multipart/form-data so'rovni formidable bilan parse qiladi.
// Natija: { fields, files } — fields qiymatlari va files qiymatlari string bo'ladi.
async function parseForm(req) {
  ensureUploadDir();
  const form = formidable({ multiples: false });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

// formidable fayl obyektini (vaqtinchalik joydan) UPLOAD_DIR ichiga ko'chiradi
// va saqlangan fayl nomini qaytaradi.
async function saveUploadedFile(file) {
  if (!file) return null;
  const f = Array.isArray(file) ? file[0] : file;
  if (!f || !f.filepath) return null;

  ensureUploadDir();
  const originalName = f.originalFilename || 'file';
  const filename = `${Date.now()}_${originalName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const destPath = path.join(UPLOAD_DIR, filename);

  await fs.promises.copyFile(f.filepath, destPath);
  await fs.promises.unlink(f.filepath).catch(() => {});

  return filename;
}

function getUploadPath(filename) {
  return path.join(UPLOAD_DIR, filename);
}

// formidable v3 fields kelishi mumkin: { name: ['John'] }. Bitta qiymatni oladi.
function getField(fields, key) {
  const value = fields?.[key];
  if (Array.isArray(value)) return value[0];
  return value;
}

module.exports = { parseForm, saveUploadedFile, getUploadPath, getField, UPLOAD_DIR };
