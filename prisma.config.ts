import "dotenv/config"
import { defineConfig, env } from "prisma/config"

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
