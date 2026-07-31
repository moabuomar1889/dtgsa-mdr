import "server-only"
import { prisma } from "@/lib/prisma/client"
import { PERMISSIONS } from "@/lib/permissions/rbac"
import {
  createEmptySearchResult,
  normalizeSearchQuery,
} from "@/lib/search/query"
import { assertUserHasAnyPermission } from "@/server/services/auth/permission-service"
import { resolveAccessibleProjectIds } from "@/server/services/auth/access-scope"
import type { requireCurrentAppUser } from "@/server/services/auth/auth-service"

type CurrentAppUser = Awaited<ReturnType<typeof requireCurrentAppUser>>

// Exported so the page can raise the framework denial before this
// framework-agnostic service throws as a backstop.
export const SEARCH_PERMISSIONS = [
  PERMISSIONS.dashboardView,
  PERMISSIONS.pdiManage,
  PERMISSIONS.mdrManage,
  PERMISSIONS.transmittalsManage,
  PERMISSIONS.clientRepliesManage,
]

export async function searchPlatform(
  user: CurrentAppUser,
  query: string | null | undefined
) {
  assertUserHasAnyPermission(user, SEARCH_PERMISSIONS)

  const search = normalizeSearchQuery(query)
  const accessibleProjectIds = await resolveAccessibleProjectIds(user)

  if (search.length < 2 || accessibleProjectIds.length === 0) {
    return createEmptySearchResult(search)
  }

  const accessibleRevisions = await prisma.documentRevision.findMany({
    where: {
      document: { projectId: { in: accessibleProjectIds }, deletedAt: null },
      deletedAt: null,
    },
    select: {
      id: true,
      revisionLabel: true,
      document: {
        select: {
          dtgsaDocumentNumber: true,
          title: true,
          project: { select: { code: true, name: true } },
        },
      },
    },
  })
  const revisionById = new Map(
    accessibleRevisions.map((revision) => [revision.id, revision])
  )

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
  const configuredClientResponseRows = await prisma.clientResponse.findMany({
    where: {
      revisionId: { in: accessibleRevisions.map((revision) => revision.id) },
      OR: [
        { externalCodeSnapshot: { contains: search, mode: "insensitive" } },
        { labelSnapshot: { contains: search, mode: "insensitive" } },
        { incomingReference: { contains: search, mode: "insensitive" } },
        { comments: { contains: search, mode: "insensitive" } },
      ],
    },
    orderBy: { receivedAt: "desc" },
    take: 10,
  })
  const configuredClientReplies = configuredClientResponseRows.flatMap(
    (response) => {
      const revision = revisionById.get(response.revisionId)
      return revision
        ? [
            {
              id: `configured-${response.id}`,
              replyDate: response.receivedAt,
              comments: response.comments,
              project: revision.document.project,
              document: {
                dtgsaDocumentNumber: revision.document.dtgsaDocumentNumber,
                title: revision.document.title,
              },
              reviewCode: {
                code: response.externalCodeSnapshot ?? "N/A",
                label: response.labelSnapshot ?? response.outcomeClass,
              },
            },
          ]
        : []
    }
  )
  const combinedClientReplies = [
    ...configuredClientReplies,
    ...clientReplies,
  ].slice(0, 10)

  return {
    search,
    counts: {
      projects: projects.length,
      pdiItems: pdiItems.length,
      mdrDocuments: mdrDocuments.length,
      transmittals: transmittals.length,
      clientReplies: combinedClientReplies.length,
    },
    projects,
    pdiItems,
    mdrDocuments,
    transmittals,
    clientReplies: combinedClientReplies,
  }
}
