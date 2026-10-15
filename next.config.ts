import type { NextConfig } from 'next';
const backendOrigin = process.env.SCRAPPY_BACKEND_ORIGIN || 'http://127.0.0.1:8000';
const target = new URL(backendOrigin);
if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password || target.pathname !== '/' || target.search || target.hash) {
  throw new Error('SCRAPPY_BACKEND_ORIGIN must be an HTTP(S) origin without credentials, path, query or fragment.');
}
const config: NextConfig = {
  output: 'standalone', poweredByHeader: false,
  // Send SSE frames immediately rather than buffering them in gzip compression.
  compress: false,
  allowedDevOrigins: ['127.0.0.1'],
  // Django owns API trailing-slash redirects; avoid a Next/Django redirect loop.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {source: '/api/v1/events', destination: `${target.origin}/api/v1/events`},
      {source: '/api/:path*', destination: `${target.origin}/api/:path*/`},
    ];
  },
};
export default config;
