/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['cblsslcreohsrhnurfev.supabase.co'], // Add your Supabase project URL
    minimumCacheTTL: 2592000, // 30 days caching
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    formats: ['image/webp', 'image/avif'],
  },
  experimental: {
    // Enable better caching
    optimizeCss: true,
    optimizePackageImports: true,
  },
}

module.exports = nextConfig
