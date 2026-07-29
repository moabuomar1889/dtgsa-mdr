import type { NextConfig } from "next"

const localAcceptance = process.env.LOCAL_ACCEPTANCE_MODE === "true"
const developmentScriptPolicy =
  process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline'${developmentScriptPolicy}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob:${localAcceptance ? "" : " https:"}`,
  "font-src 'self' data:",
  `connect-src 'self'${localAcceptance ? "" : " https:"}`,
  "worker-src 'self' blob:",
].join("; ")

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
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
    "@dtg/authorization",
    "@dtg/controlled-storage-domain",
    "@dtg/cover-designer",
    "@dtg/trust-domain",
    "@dtg/workflow-engine-domain",
    "@dtg/database",
    "@dtg/document-control-domain",
    "@dtg/identity-domain",
    "@dtg/local-acceptance",
    "@dtg/pdf-engine",
  ],
  images: {
    remotePatterns: [],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }]
  },
}

export default nextConfig
