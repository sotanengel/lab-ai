/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@lab-ai/shared"],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
