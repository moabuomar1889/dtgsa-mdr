import type { NextConfig } from "next"

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value:
      "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:",
  },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
]

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: [
    "@dtg/configuration",
    "@dtg/contracts",
    "@dtg/identity-domain",
    "@dtg/review-domain",
    "@dtg/ui",
  ],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }]
  },
}

export default nextConfig
