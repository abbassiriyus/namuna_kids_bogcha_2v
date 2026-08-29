// Backend API manzili uchun yagona manba.
//
// Backend shu Next.js loyihaning o'zida ishlaydi (src/pages/api), shuning uchun
// odatda NEXT_PUBLIC_API_URL umuman kerak emas — nisbiy '/api' ishlatiladi va
// frontend qaysi domen/portda bo'lsa, backend ham o'shanda bo'ladi.
//
// NEXT_PUBLIC_API_URL faqat backend boshqa domenda turgan holat uchun.
// Oxiridagi '/api' yozilmagan bo'lsa o'zimiz qo'shamiz — aks holda so'rovlar
// '/admin/login' ga (ya'ni '/api' siz) ketib, 404 beradi.
function resolveBaseUrl() {
  const raw = (process.env.NEXT_PUBLIC_API_URL || '').trim();
  if (!raw) return '/api';

  const withoutSlash = raw.replace(/\/+$/, '');
  if (/\/api$/i.test(withoutSlash)) return withoutSlash;
  return `${withoutSlash}/api`;
}

const url = resolveBaseUrl();

export default url;
