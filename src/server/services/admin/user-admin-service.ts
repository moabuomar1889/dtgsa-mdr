import "server-only"
import { prisma } from "@/lib/prisma/client"

export async function getUserAdminOverview() {
  const [users, roles, permissions] = await Promise.all([
    prisma.user.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: [{ fullName: "asc" }],
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
        projectRoles: {
          include: {
            role: true,
            project: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
        signatureProfile: true,
      },
    }),
    prisma.role.findMany({
      orderBy: [{ name: "asc" }],
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
          orderBy: [{ permission: { group: "asc" } }, { permission: { code: "asc" } }],
        },
        _count: {
          select: {
            userRoles: true,
            projectRoles: true,
          },
        },
      },
    }),
    prisma.permission.findMany({
      orderBy: [{ group: "asc" }, { code: "asc" }],
    }),
  ])

  return {
    users,
    roles,
    permissions,
  }
}
