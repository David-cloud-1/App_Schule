import type { NextConfig } from "next";
import { LEGACY_ADMIN_REDIRECTS } from "./src/lib/redirects";

const nextConfig: NextConfig = {
  // PROJ-131: alte Adressen leiten auf „Lerninhalte“ bzw. den passenden Papierkorb
  async redirects() {
    return LEGACY_ADMIN_REDIRECTS
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
    ]
  },
};

export default nextConfig;
