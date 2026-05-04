/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.google.com"
      }
    ]
  },
  async redirects() {
    return [
      {
        source: "/demo",
        destination: "/workspace",
        permanent: false
      },
      {
        source: "/demo/:path*",
        destination: "/workspace/:path*",
        permanent: false
      }
    ];
  },
  async rewrites() {
    return [
      {
        source: "/workspace",
        destination: "/demo"
      },
      {
        source: "/workspace/:path*",
        destination: "/demo/:path*"
      }
    ];
  }
};
module.exports = nextConfig;
