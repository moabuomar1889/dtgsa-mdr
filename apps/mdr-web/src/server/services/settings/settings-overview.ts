import "server-only"
import { prisma } from "@/lib/prisma/client"
import { env, hasGoogleDriveServiceAccount } from "@/lib/config/env"
import { getGoogleDriveIntegrationDiagnostic } from "@/server/services/integrations/google-drive-diagnostics"

export async function getSettingsOverview() {
  const [systemSettings, googleDrive] = await Promise.all([
    prisma.systemSetting.findMany({
      orderBy: [{ group: "asc" }, { key: "asc" }],
      take: 20,
    }),
    getGoogleDriveIntegrationDiagnostic(),
  ])

  return {
    systemSettings,
    googleDrive,
    integrations: {
      databaseAuthority: "PostgreSQL / Prisma",
      localProviders: process.env.LOCAL_ACCEPTANCE_MODE === "true",
      googleServiceAccount: hasGoogleDriveServiceAccount,
      emailProvider: env.EMAIL_PROVIDER ?? null,
      libreOfficeConfigured: Boolean(env.LIBREOFFICE_PATH),
    },
  }
}
