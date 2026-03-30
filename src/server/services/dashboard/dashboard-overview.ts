import "server-only"
import { prisma } from "@/lib/prisma/client"
import { getGoogleDriveIntegrationDiagnostic } from "@/server/services/integrations/google-drive-diagnostics"

export async function getDashboardOverview() {
  const [
    clientCount,
    projectCount,
    disciplineCount,
    documentTypeCount,
    reviewCodeCount,
    numberingRuleCount,
    googleDrive,
  ] = await Promise.all([
    prisma.client.count({
      where: {
        deletedAt: null,
      },
    }),
    prisma.project.count({
      where: {
        deletedAt: null,
      },
    }),
    prisma.discipline.count({
      where: {
        deletedAt: null,
      },
    }),
    prisma.documentTypeCategory.count(),
    prisma.reviewCode.count(),
    prisma.numberingRule.count(),
    getGoogleDriveIntegrationDiagnostic(),
  ])

  return {
    clientCount,
    projectCount,
    disciplineCount,
    documentTypeCount,
    reviewCodeCount,
    numberingRuleCount,
    googleDrive,
  }
}
