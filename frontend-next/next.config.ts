import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://maps.didi.et/api/:path*',
      },
    ];
  },
};

export default nextConfig;
