// Next.js instrumentation hook: server ishga tushganda (har bir process boshida)
// bir marta chaqiriladi. `pg` kabi faqat Node.js'da ishlaydigan paketlar Edge
// runtime uchun bundle qilinganda ("Can't resolve 'fs'") xato beradi — shuning
// uchun haqiqiy logika alohida instrumentation-node.js faylida, faqat Node.js
// runtime'da dinamik import qilinadi (Next.js hujjatlaridagi rasmiy pattern).
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./instrumentation-node.js');
  }
}
