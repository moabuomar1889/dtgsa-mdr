import "server-only"
import { computeFolderRoute } from "@dtg/controlled-storage-domain"
import { prisma } from "@/lib/prisma/client"

const DEFAULT_TEMPLATE = ["year", "client", "project", "document", "revision"]

export function previewControlledFolderRoute(input: {
  template?: string[]
  values: Record<string, string | number>
}) {
  return computeFolderRoute(input.template ?? DEFAULT_TEMPLATE, input.values)
}

export async function publishFolderRoutingRule(input: {
  actorUserId: string
  scopeType: string
  scopeId?: string | null
  folderKind: string
  providerKey: string
  displayName: string
  template: string[]
}) {
  return prisma.$transaction(async (tx) => {
    const latest = await tx.storageFolderRule.findFirst({
      where: {
        scopeType: input.scopeType,
        scopeId: input.scopeId,
        folderKind: input.folderKind,
      },
      orderBy: { version: "desc" },
    })
    await tx.storageFolderRule.updateMany({
      where: {
        scopeType: input.scopeType,
        scopeId: input.scopeId,
        folderKind: input.folderKind,
        isActive: true,
      },
      data: { isActive: false },
    })
    const rule = await tx.storageFolderRule.create({
      data: {
        scopeType: input.scopeType,
        scopeId: input.scopeId,
        folderKind: input.folderKind,
        providerKey: input.providerKey,
        version: (latest?.version ?? 0) + 1,
        displayName: input.displayName,
        routeTemplate: input.template,
        changedByUserId: input.actorUserId,
      },
    })
    await tx.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        action: "controlled_drive.folder_rule.published",
        entityType: "StorageFolderRule",
        entityId: rule.id,
        afterSnapshot: {
          version: rule.version,
          template: input.template,
        },
      },
    })
    return rule
  })
}
