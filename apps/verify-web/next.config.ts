import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: [
    "@dtg/configuration",
    "@dtg/contracts",
    "@dtg/database",
    "@dtg/ui",
    "@dtg/verification-domain",
  ],
}

export default nextConfig
