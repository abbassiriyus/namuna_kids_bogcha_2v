const nextConfig = {
  // Serverga bitta papka sifatida ko'chirish uchun (scripts/prepare-standalone.js).
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  // MUHIM: `trailingSlash: true` qo'shmang — u /api/... so'rovlarini ham
  // /api/.../ ga 308 bilan yo'naltiradi va POST/PUT so'rovlar (login shular
  // qatorida) ba'zi klientlarda tanasini yo'qotib, xato beradi.
};

export default nextConfig;
