// Postgres xatolarini foydalanuvchi tushunadigan o'zbekcha xabarga aylantiradi.
// Maqsad: bazadan kelgan texnik xato (500) o'rniga aniq sabab (400) qaytarish.

// Postgres xato kodlari: https://www.postgresql.org/docs/current/errcodes-appendix.html
const CODES = {
  '23502': 'notNull',      // not_null_violation
  '23503': 'foreignKey',   // foreign_key_violation
  '23505': 'unique',       // unique_violation
  '23514': 'check',        // check_violation
  '22P02': 'invalidText',  // invalid_text_representation (masalan "abc" -> integer)
  '22003': 'outOfRange',   // numeric_value_out_of_range
  '22007': 'invalidDate',  // invalid_datetime_format
  '22008': 'invalidDate',  // datetime_field_overflow
};

// Ustun nomlarini foydalanuvchiga tanish so'zga aylantiradi.
const COLUMN_LABELS = {
  hajm: 'Hajm',
  narx: 'Narx',
  price: 'Narx',
  miqdor: 'Miqdor',
  sklad_product_id: 'Mahsulot',
  bola_id: 'Bola',
  xodim_id: 'Xodim',
  guruh_id: 'Guruh',
  lavozim_id: 'Lavozim',
  darssana_id: 'Dars kuni',
  sana: 'Sana',
  chiqim_sana: 'Chiqim sanasi',
  name: 'Nomi',
  nomi: 'Nomi',
  username: 'Login',
  metrka: 'Metrika raqami',
  phone: 'Telefon',
  phone_number: 'Telefon raqami',
  oylik: 'Oylik',
  oylik_toliv: 'Oylik to‘lov',
  balans: 'Balans',
};

function label(column) {
  if (!column) return 'Maydon';
  return COLUMN_LABELS[column] || column;
}

function toUserError(err, fallback = 'Amalni bajarishda xatolik yuz berdi') {
  const kind = CODES[err?.code];

  switch (kind) {
    case 'notNull':
      return { status: 400, message: `${label(err.column)} to‘ldirilishi shart` };
    case 'unique': {
      // Postgres DETAIL maydoni server tili bo'yicha turlicha bo'ladi, masalan:
      //   en: `Key (username)=(admin3) already exists.`
      //   ru: `Ключ "(username)=(admin3)" уже существует.`
      // Faqat til-mustaqil "(ustun)=(qiymat)" qismini ajratib olamiz.
      const m = /\(([^()=]+)\)=\(([^()]+)\)/.exec(err.detail || '');
      if (m) {
        const [, col, val] = m;
        return { status: 400, message: `${label(col)} band: “${val}” allaqachon mavjud` };
      }
      return { status: 400, message: 'Bunday yozuv allaqachon mavjud (takrorlanmas qiymat)' };
    }
    case 'foreignKey':
      return {
        status: 400,
        message: 'Bog‘liq yozuv topilmadi yoki bu yozuv boshqa joyda ishlatilmoqda',
      };
    case 'check':
      return { status: 400, message: 'Kiritilgan qiymat ruxsat etilgan oraliqdan tashqarida' };
    case 'invalidText':
      return { status: 400, message: 'Kiritilgan qiymat noto‘g‘ri formatda (raqam kutilgan)' };
    case 'outOfRange':
      return { status: 400, message: 'Kiritilgan son juda katta' };
    case 'invalidDate':
      return { status: 400, message: 'Sana noto‘g‘ri formatda' };
    default:
      return { status: 500, message: fallback };
  }
}

function sendDbError(res, err, fallback) {
  const { status, message } = toUserError(err, fallback);
  if (status === 500) console.error(fallback || 'DB xatolik:', err.message);
  // Frontendlarning bir qismi `.error`, boshqa qismi `.message`ni o'qiydi —
  // ikkalasini ham jo'natib, qaysi birini ishlatishidan qat'i nazar aniq
  // xabar ko'rinishini ta'minlaymiz.
  return res.status(status).json({ error: message, message });
}

module.exports = { toUserError, sendDbError };
