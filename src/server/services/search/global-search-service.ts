import "server-only"
import { prisma } from "@/lib/prisma/client"
import { PERMISSIONS } from "@/lib/permissions/rbac"
import { assertUserHasAnyPermission } from "@/server/services/auth/permission-service"
import { resolveAccessibleProjectIds } from "@/server/services/auth/access-scope"
import type { requireCurrentAppUser } from "@/server/services/auth/auth-service"

type CurrentAppUser = Awaited<ReturnType<typeof requireCurrentAppUser>>

function normalizeQuery(query: string | null | undefined) {
  return query?.trim() ?? ""
}

export async function searchPlatform(
  user: CurrentAppUser,
  query: string | null | undefined
) {
  assertUserHasAnyPermission(user, [
    PERMISSIONS.dashboardView,
    PERMISSIONS.pdiManage,
    PERMISSIONS.mdrManage,
    PERMISSIONS.transmittalsManage,
    PERMISSIONS.clientRepliesManage,
  ])

  const search = normalizeQuery(query)
  const accessibleProjectIds = await resolveAccessibleProjectIds(user)

  if (search.length < 2 || accessibleProjectIds.length === 0) {
    return {
      search,
      counts: {
        projects: 0,
        pdiItems: 0,
        mdrDocuments: 0,
        transmittals: 0,
        clientReplies: 0,
      },
      projects: [],
      pdiItems: [],
      mdrDocuments: [],
      transmittals: [],
      clientReplies: [],
    }
  }

  const projectWhere = {
    deletedAt: null,
    id: {
      in: accessibleProjectIds,
    },
    OR: [
      {
        code: {
          contains: search,
          mode: "insensitive" as const,
        },
      },
      {
        name: {
          contains: search,
          mode: "insensitive" as const,
        },
      },
      {
        client: {
          name: {
            contains: search,
            mode: "insensitive" as const,
          },
        },
      },
      {
        client: {
          code: {
            contains: search,
            mode: "insensitive" as const,
          },
        },
      },
    ],
  }

  const pdiWhere = {
    deletedAt: null,
    projectId: {
      in: accessibleProjectIds,
    },
    OR: [
      {
        dtgsaDocumentNumber: {
          contains: search,
          mode: "insensitive" as const,
        },
      },
      {
        clientDocumentNumber: {
          contains: search,
          mode: "insensitive" as const,
        },
      },
      {
        title: {
          contains: search,
          mode: "insensitive" as const,
        },
      },
      {
        project: {
          code: {
            contains: search,
            mode: "insensitive" as const,
          },
        },
      },
    ],
  }

  const mdrWhere = {
    deletedAt: null,
    projectId: {
      in: accessibleProjectIds,
    },
    OR: [
      {
        dtgsaDocumentNumber: {
          contains: search,
          mode: "insensitive" as const,
        },
      },
      {
        clientDocumentNumber: {
          contains: search,
          mode: "insensitive" as const,
        },
      },
      {
        title: {
          contains: search,
          mode: "insensitive" as const,
        },
      },
      {
        project: {
          code: {
            contains: search,
            mode: "insensitive" as const,
          },
        },
      },
    ],
  }

  const transmittalWhere = {
    deletedAt: null,
    projectId: {
      in: accessibleProjectIds,
    },
    OR: [
      {
        transmittalNumber: {
          contains: search,
          mode: "insensitive" as const,
        },
      },
      {
        subject: {
          contains: search,
          mode: "insensitive" as const,
        },
      },
      {
        project: {
          code: {
            contains: search,
            mode: "insensitive" as const,
          },
        },
      },
    ],
  }

  const replyWhere = {
    deletedAt: null,
    projectId: {
      in: accessibleProjectIds,
    },
    OR: [
      {
        comments: {
          contains: search,
          mode: "insensitive" as const,
        },
      },
      {
        driveFileName: {
          contains: search,
          mode: "insensitive" as const,
        },
      },
      {
        document: {
          dtgsaDocumentNumber: {
            contains: search,
            mode: "insensitive" as const,
          },
        },
      },
      {
        project: {
          code: {
            contains: search,
            mode: "insensitive" as const,
          },
        },
      },
    ],
  }

  const [projects, pdiItems, mdrDocuments, transmittals, clientReplies] =
    await Promise.all([
      prisma.project.findMany({
        where: projectWhere,
        orderBy: [{ code: "asc" }],
        take: 8,
        include: {
          client: {
            select: {
              code: true,
              name: true,
            },
          },
        },
      }),
      prisma.pdiItem.findMany({
        where: pdiWhere,
        orderBy: [{ updatedAt: "desc" }],
        take: 10,
        include: {
          project: {
            select: {
              code: true,
              name: true,
            },
          },
          discipline: {
            select: {
              code: true,
            },
          },
        },
      }),
      prisma.mdrDocument.findMany({
        where: mdrWhere,
        orderBy: [{ updatedAt: "desc" }],
        take: 10,
        include: {
          project: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          discipline: {
            select: {
              code: true,
            },
          },
          currentRevision: {
            select: {
              revisionLabel: true,
              workflowStatus: true,
            },
          },
        },
      }),
      prisma.transmittal.findMany({
        where: transmittalWhere,
        orderBy: [{ updatedAt: "desc" }],
        take: 10,
        include: {
          project: {
            select: {
              code: true,
              name: true,
            },
          },
          _count: {
            select: {
              items: true,
            },
          },
        },
      }),
      prisma.clientReply.findMany({
        where: replyWhere,
        orderBy: [{ replyDate: "desc" }],
        take: 10,
        include: {
          project: {
            select: {
              code: true,
              name: true,
            },
          },
          document: {
            select: {
              dtgsaDocumentNumber: true,
              title: true,
            },
          },
          reviewCode: {
            select: {
              code: true,
              label: true,
            },
          },
        },
      }),
    ])

  return {
    search,
    counts: {
      projects: projects.length,
      pdiItems: pdiItems.length,
      mdrDocuments: mdrDocuments.length,
      transmittals: transmittals.length,
      clientReplies: clientReplies.length,
    },
    projects,
    pdiItems,
    mdrDocuments,
    transmittals,
    clientReplies,
  }
}
