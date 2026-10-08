import type { NextConfig } from "next";

// Live telemetry + server API proxies: every route is dynamic by design (see the
// `force-dynamic` exports in app/api/*). Cache Components is intentionally not used.
const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
