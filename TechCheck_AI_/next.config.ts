import type { NextConfig } from 'next';
const config: NextConfig = {
  serverExternalPackages: ['pdf-parse', '@napi-rs/canvas'],
  poweredByHeader: false,
  webpack(config) {
    // Keep Windows junction paths consistent across the compiler and its SWC loader.
    config.resolve.symlinks = false;
    config.resolveLoader.symlinks = false;
    return config;
  },
  async headers() {
    return [{ source: '/(.*)', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'same-origin' },
      { key: 'X-Frame-Options', value: 'DENY' },
    ] }];
  },
};
export default config;
