import { config } from "dotenv"
import { defineConfig, env } from "prisma/config"

config({ path: "apps/mdr-web/.env", quiet: true })
config({ path: ".env", quiet: true })

type PrismaConfigEnv = {
  DATABASE_URL: string
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env<PrismaConfigEnv>("DATABASE_URL"),
  },
})
