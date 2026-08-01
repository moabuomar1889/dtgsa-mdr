import { config } from "dotenv"
import { defineConfig } from "prisma/config"

config({ path: "apps/mdr-web/.env", quiet: true })
config({ path: ".env", quiet: true })

const databaseUrl = process.env.DATABASE_URL?.trim()

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // Client generation needs only the schema. Migration and introspection
  // commands still fail closed when their required datasource is absent.
  datasource: databaseUrl ? { url: databaseUrl } : undefined,
})
