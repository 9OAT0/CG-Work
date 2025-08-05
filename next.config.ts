import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['sharp'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
  // Increase API route body size limit for file uploads
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
  // Enable static file serving from uploads directory
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/files/:path*',
      },
    ];
  },
};

export default nextConfig;
