const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET || 'mysecretkey';

// Token bo'lmasa yoki noto'g'ri bo'lsa null qaytaradi (login talab qilmaydigan route'lar uchun).
function verifyToken(req) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return null;
  try {
    return jwt.verify(token, SECRET_KEY);
  } catch {
    return null;
  }
}

// Express middleware'ning o'rnini bosadi: handler'ni JWT tekshiruvi bilan o'raydi.
function requireAuth(handler) {
  return async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Token kerak' });

    try {
      req.user = jwt.verify(token, SECRET_KEY);
    } catch {
      return res.status(403).json({ message: 'Token noto‘g‘ri yoki muddati tugagan' });
    }

    return handler(req, res);
  };
}

module.exports = { verifyToken, requireAuth, SECRET_KEY };
