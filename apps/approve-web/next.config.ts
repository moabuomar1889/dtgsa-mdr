import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: [
    "@dtg/configuration",
    "@dtg/contracts",
    "@dtg/identity-domain",
    "@dtg/review-domain",
    "@dtg/ui",
  ],
}

export default nextConfig
