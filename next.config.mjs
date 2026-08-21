const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/:path*',
        destination: '/:path*',
      },
      {
        source: '/popular/:id',
        destination: '/popular/[id]',
      },
      {
        source: '/catalog/:id',
        destination: '/catalog/[id]',
      },
      {
        source: '/oneproduct/:id',
        destination: '/oneproduct/[id]',
      },
        {
        source: '/uploads/:path*',
        destination: 'https://fre.abbas.uz/upload/:path*', // Proxy
      },
    ];
  },
  // removed `output: 'export'` to allow dev server and API routes
  images: {
    unoptimized: true,
  }, 
  trailingSlash: true,
}

export default nextConfig;