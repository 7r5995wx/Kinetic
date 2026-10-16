/** @type {import('next').NextConfig} */
const rawBackendUrl =
  process.env.BACKEND_API_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  (process.env.VERCEL === "1"
    ? (() => {
        throw new Error(
          "Missing BACKEND_API_INTERNAL_URL or NEXT_PUBLIC_BACKEND_URL in Vercel environment."
        );
      })()
    : "http://localhost:8080");

const backendUrl = rawBackendUrl.replace(/\/+$/, "");

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
