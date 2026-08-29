const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');

// JWT imzo kaliti. Bu kalitni bilgan odam o'ziga istalgan admin (jumladan
// superadmin) tokenini yasab, tizimga to'liq kira oladi. Shuning uchun u
// faqat serverdagi JWT_SECRET env o'zgaruvchisidan olinishi kerak.
const DEV_FALLBACK = 'mysecretkey';

// Loyihada avval ishlatilgan yoki keng tarqalgan qiymatlar — bularni haqiqiy
// kalit deb qabul qilmaymiz.
const WEAK_SECRETS = new Set(['mysecretkey', 'secret', 'secretkey', 'changeme', 'jwtsecret', 'test']);

function resolveSecret() {
  const fromEnv = (process.env.JWT_SECRET || '').trim();
  const isProduction = process.env.NODE_ENV === 'production';
  const isWeak = !fromEnv || WEAK_SECRETS.has(fromEnv.toLowerCase());

  if (!isWeak) {
    if (fromEnv.length < 32) {
      console.warn(
        `[auth] ⚠️  JWT_SECRET juda qisqa (${fromEnv.length} belgi). Kamida 32 belgi tavsiya etiladi: ` +
          'node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'
      );
    }
    return fromEnv;
  }

  if (!isProduction) {
    // Dev rejimida qulaylik muhimroq: kalit barqaror bo'lsin, aks holda har
    // qayta yuklashda tizimdan chiqib ketasiz.
    console.warn(
      '[auth] ⚠️  JWT_SECRET qo\'yilmagan — dev uchun vaqtinchalik kalit ishlatilmoqda. ' +
        'Productionda albatta .env orqali bering.'
    );
    return fromEnv || DEV_FALLBACK;
  }

  // Productionda ma'lum kalitga tushib qolish — himoyani butunlay ochib
  // qo'yish demak. Uning o'rniga har bir process uchun tasodifiy kalit
  // yasaymiz: tizim ishlayveradi, lekin tashqi odam token yasay olmaydi.
  // Yon ta'siri: server qayta ishga tushganda hamma qaytadan login qiladi —
  // bu holat tuzatilishi kerakligining aniq belgisi.
  console.error(
    '[auth] ❌ JWT_SECRET qo\'yilmagan yoki juda oddiy! Vaqtinchalik tasodifiy kalit ishlatilmoqda — ' +
      'server har qayta ishga tushganda foydalanuvchilar tizimdan chiqib ketadi. ' +
      'Server sozlamalarida JWT_SECRET ni belgilang.'
  );
  return crypto.randomBytes(48).toString('hex');
}

const SECRET_KEY = resolveSecret();

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
