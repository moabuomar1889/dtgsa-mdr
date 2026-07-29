import "server-only"
import { z } from "zod"
import { hashOpaqueToken } from "@dtg/identity-domain"
import { prisma } from "@/lib/prisma/client"

const groupMappingSchema = z.object({
  groupId: z.string().trim().min(2).max(255),
  roleCode: z.string().trim().min(2).max(100),
  projectId: z.string().trim().min(1).nullable().optional(),
  departmentId: z.string().trim().min(1).nullable().optional(),
  isActive: z.boolean().default(true),
})

const overrideSchema = z.object({
  userId: z.string().min(1),
  roleCode: z.string().min(2).max(100),
  projectId: z.string().min(1).nullable().optional(),
})

export async function upsertGoogleGroupMapping(
  actorUserId: string,
  input: unknown
) {
  const parsed = groupMappingSchema.parse(input)
  const [role, project, department] = await Promise.all([
    prisma.role.findUnique({ where: { code: parsed.roleCode } }),
    parsed.projectId
      ? prisma.project.findUnique({ where: { id: parsed.projectId } })
      : null,
    parsed.departmentId
      ? prisma.department.findUnique({ where: { id: parsed.departmentId } })
      : null,
  ])
  if (!role) throw new Error("Mapped platform role does not exist.")
  if (parsed.projectId && !project) {
    throw new Error("Mapped project does not exist.")
  }
  if (parsed.departmentId && !department) {
    throw new Error("Mapped department does not exist.")
  }

  return prisma.$transaction(async (tx) => {
    const mapping = await tx.googleGroupMapping.upsert({
      where: { groupId: parsed.groupId },
      update: {
        roleCode: parsed.roleCode,
        projectId: parsed.projectId,
        departmentId: parsed.departmentId,
        isActive: parsed.isActive,
      },
      create: parsed,
    })
    const latest = await tx.googleGroupMappingVersion.findFirst({
      where: { mappingId: mapping.id },
      orderBy: { version: "desc" },
      select: { version: true },
    })
    const version = await tx.googleGroupMappingVersion.create({
      data: {
        mappingId: mapping.id,
        version: (latest?.version ?? 0) + 1,
        changedByUserId: actorUserId,
        snapshot: {
          groupId: mapping.groupId,
          roleCode: mapping.roleCode,
          projectId: mapping.projectId,
          departmentId: mapping.departmentId,
          isActive: mapping.isActive,
        },
      },
    })
    await tx.auditLog.create({
      data: {
        actorUserId,
        projectId: mapping.projectId,
        action: "identity.group_mapping.changed",
        entityType: "GoogleGroupMapping",
        entityId: mapping.id,
        afterSnapshot: {
          version: version.version,
          groupIdHash: hashOpaqueToken(mapping.groupId),
          roleCode: mapping.roleCode,
          isActive: mapping.isActive,
        },
      },
    })
    return { mapping, version }
  })
}

export async function createIdentityRoleOverride(
  actorUserId: string,
  input: unknown
) {
  const parsed = overrideSchema.parse(input)
  const [user, role, project] = await Promise.all([
    prisma.user.findUnique({ where: { id: parsed.userId } }),
    prisma.role.findUnique({ where: { code: parsed.roleCode } }),
    parsed.projectId
      ? prisma.project.findUnique({ where: { id: parsed.projectId } })
      : null,
  ])
  if (!user || !role || (parsed.projectId && !project)) {
    throw new Error(
      "Role override references an invalid user, role, or project."
    )
  }

  return prisma.$transaction(async (tx) => {
    const override = await tx.identityRoleOverride.create({
      data: {
        userId: user.id,
        roleCode: role.code,
        projectId: parsed.projectId,
        createdByUserId: actorUserId,
      },
    })
    if (parsed.projectId) {
      await tx.userProjectRole.upsert({
        where: {
          userId_projectId_roleId: {
            userId: user.id,
            projectId: parsed.projectId,
            roleId: role.id,
          },
        },
        update: {},
        create: {
          userId: user.id,
          projectId: parsed.projectId,
          roleId: role.id,
        },
      })
    } else {
      await tx.userRole.upsert({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId: role.id,
          },
        },
        update: {},
        create: {
          userId: user.id,
          roleId: role.id,
        },
      })
    }
    await tx.auditLog.create({
      data: {
        actorUserId,
        projectId: parsed.projectId,
        action: "identity.role_override.created",
        entityType: "IdentityRoleOverride",
        entityId: override.id,
        afterSnapshot: {
          userId: user.id,
          roleCode: role.code,
          projectId: parsed.projectId ?? null,
        },
      },
    })
    return override
  })
}

export async function deactivateIdentityRoleOverride(
  actorUserId: string,
  overrideId: string
) {
  const override = await prisma.identityRoleOverride.findUnique({
    where: { id: overrideId },
  })
  if (!override || override.inactiveAt) return
  await prisma.$transaction([
    prisma.identityRoleOverride.update({
      where: { id: override.id },
      data: { inactiveAt: new Date() },
    }),
    prisma.auditLog.create({
      data: {
        actorUserId,
        projectId: override.projectId,
        action: "identity.role_override.deactivated",
        entityType: "IdentityRoleOverride",
        entityId: override.id,
      },
    }),
  ])
}
